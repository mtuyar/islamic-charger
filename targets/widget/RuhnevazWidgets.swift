import WidgetKit
import SwiftUI

// MARK: - Shared storage (written by services/widgets.ts via App Group)

let appGroup = "group.com.mtuyarr.ruhnevaz"

struct DailyItem: Codable {
  let id: String
  let type: String       // ayah | hadith | wisdom
  let arabic: String
  let tr: String
  let en: String
  let sourceTr: String
  let sourceEn: String
}

struct PrayerDay: Codable {
  let date: String
  let Fajr: String
  let Sunrise: String
  let Dhuhr: String
  let Asr: String
  let Maghrib: String
  let Isha: String
  let Imsak: String?
  let hijri: String?
}

struct PrayerPayload: Codable {
  let location: String
  let days: [PrayerDay]
}

struct Labels: Codable {
  var fajr = "İmsak", sunrise = "Güneş", dhuhr = "Öğle", asr = "İkindi", maghrib = "Akşam", isha = "Yatsı"
  var next = "Sıradaki", dailyTitle = "Günün Nasibi", ayah = "Ayet", hadith = "Hadis", wisdom = "Hikmet"
  var noLocation = "Konum seçilmedi"
}

enum Store {
  static var defaults: UserDefaults? { UserDefaults(suiteName: appGroup) }

  static var lang: String { defaults?.string(forKey: "lang") ?? "tr" }

  static var labels: Labels {
    guard let raw = defaults?.string(forKey: "labels"), let data = raw.data(using: .utf8),
          let l = try? JSONDecoder().decode(Labels.self, from: data) else { return Labels() }
    return l
  }

  static var daily: [DailyItem] {
    guard let raw = defaults?.string(forKey: "daily"), let data = raw.data(using: .utf8),
          let items = try? JSONDecoder().decode([DailyItem].self, from: data) else { return [] }
    return items
  }

  static var prayer: PrayerPayload? {
    guard let raw = defaults?.string(forKey: "prayer"), !raw.isEmpty, let data = raw.data(using: .utf8) else { return nil }
    return try? JSONDecoder().decode(PrayerPayload.self, from: data)
  }
}

// MARK: - Helpers

let dayFormatter: DateFormatter = {
  let f = DateFormatter()
  f.dateFormat = "yyyy-MM-dd"
  f.locale = Locale(identifier: "en_US_POSIX")
  return f
}()

func dailyItem(for date: Date) -> DailyItem? {
  let items = Store.daily
  guard !items.isEmpty else { return nil }
  // Same formula as data/dailyContent.ts (UTC day number) so app and widget agree.
  let cal = Calendar.current
  let comps = cal.dateComponents([.year, .month, .day], from: date)
  var utc = Calendar(identifier: .gregorian)
  utc.timeZone = TimeZone(identifier: "UTC")!
  let utcDate = utc.date(from: comps) ?? date
  let dayNumber = Int(floor(utcDate.timeIntervalSince1970 / 86_400))
  return items[((dayNumber % items.count) + items.count) % items.count]
}

struct PrayerSlot {
  let key: String
  let name: String
  let date: Date
}

func slots(for day: PrayerDay, labels: Labels) -> [PrayerSlot] {
  guard let base = dayFormatter.date(from: day.date) else { return [] }
  let cal = Calendar.current
  func at(_ hhmm: String) -> Date? {
    let parts = hhmm.split(separator: ":").compactMap { Int($0) }
    guard parts.count == 2 else { return nil }
    return cal.date(bySettingHour: parts[0], minute: parts[1], second: 0, of: base)
  }
  let pairs: [(String, String, String)] = [
    ("Fajr", labels.fajr, day.Fajr), ("Sunrise", labels.sunrise, day.Sunrise), ("Dhuhr", labels.dhuhr, day.Dhuhr),
    ("Asr", labels.asr, day.Asr), ("Maghrib", labels.maghrib, day.Maghrib), ("Isha", labels.isha, day.Isha),
  ]
  return pairs.compactMap { key, name, time in at(time).map { PrayerSlot(key: key, name: name, date: $0) } }
}

/// All prayer slots from today onwards, sorted.
func allSlots() -> [PrayerSlot] {
  guard let payload = Store.prayer else { return [] }
  let labels = Store.labels
  return payload.days.flatMap { slots(for: $0, labels: labels) }.sorted { $0.date < $1.date }
}

func todayDay() -> PrayerDay? {
  let key = dayFormatter.string(from: Date())
  return Store.prayer?.days.first { $0.date == key }
}

// MARK: - Daily widget

struct DailyEntry: TimelineEntry {
  let date: Date
  let item: DailyItem?
  let lang: String
  let labels: Labels
}

struct DailyProvider: TimelineProvider {
  func placeholder(in context: Context) -> DailyEntry {
    DailyEntry(date: Date(), item: DailyItem(id: "p", type: "ayah",
      arabic: "فَٱذْكُرُونِىٓ أَذْكُرْكُمْ", tr: "Beni anın, Ben de sizi anayım.", en: "Remember Me; I will remember you.",
      sourceTr: "Bakara 2:152", sourceEn: "Al-Baqarah 2:152"), lang: "tr", labels: Labels())
  }
  func getSnapshot(in context: Context, completion: @escaping (DailyEntry) -> Void) {
    completion(DailyEntry(date: Date(), item: dailyItem(for: Date()) ?? placeholder(in: context).item, lang: Store.lang, labels: Store.labels))
  }
  func getTimeline(in context: Context, completion: @escaping (Timeline<DailyEntry>) -> Void) {
    var entries: [DailyEntry] = []
    let cal = Calendar.current
    let start = cal.startOfDay(for: Date())
    for offset in 0..<7 {
      let d = cal.date(byAdding: .day, value: offset, to: start)!
      entries.append(DailyEntry(date: offset == 0 ? Date() : d, item: dailyItem(for: d), lang: Store.lang, labels: Store.labels))
    }
    completion(Timeline(entries: entries, policy: .atEnd))
  }
}

struct DailyWidgetView: View {
  @Environment(\.widgetFamily) var family
  let entry: DailyEntry

  var text: String { entry.lang == "tr" ? (entry.item?.tr ?? "") : (entry.item?.en ?? "") }
  var source: String { entry.lang == "tr" ? (entry.item?.sourceTr ?? "") : (entry.item?.sourceEn ?? "") }
  var kind: String {
    switch entry.item?.type {
    case "hadith": return entry.labels.hadith
    case "wisdom": return entry.labels.wisdom
    default: return entry.labels.ayah
    }
  }

  var body: some View {
    switch family {
    case .accessoryRectangular:
      VStack(alignment: .leading, spacing: 2) {
        HStack(spacing: 4) {
          Image(systemName: "moon.stars.fill").font(.system(size: 10))
          Text(kind.uppercased()).font(.system(size: 10, weight: .semibold))
        }.widgetAccentable()
        Text(text).font(.system(size: 12)).lineLimit(3).minimumScaleFactor(0.8)
      }
    case .accessoryInline:
      Label(text, systemImage: "moon.stars.fill")
    case .systemMedium, .systemLarge:
      VStack(alignment: .leading, spacing: 8) {
        HStack {
          Text(kind.uppercased()).font(.system(size: 10, weight: .semibold)).tracking(1.5).foregroundStyle(Color("mint"))
          Spacer()
          Image(systemName: "moon.stars.fill").foregroundStyle(Color("mint")).font(.system(size: 12))
        }
        if let ar = entry.item?.arabic, !ar.isEmpty, family == .systemLarge {
          Text(ar).font(.system(size: 22, weight: .regular, design: .serif))
            .multilineTextAlignment(.trailing).frame(maxWidth: .infinity, alignment: .trailing)
            .foregroundStyle(Color("cream")).lineLimit(3).minimumScaleFactor(0.7)
        }
        Text(text).font(.system(size: family == .systemLarge ? 16 : 14, weight: .medium, design: .serif))
          .foregroundStyle(Color("cream")).lineLimit(family == .systemLarge ? 8 : 4).minimumScaleFactor(0.8)
        Spacer(minLength: 0)
        HStack {
          Text(source).font(.system(size: 11)).foregroundStyle(Color("cream").opacity(0.75))
          Spacer()
          Text("Ruhnevâz").font(.system(size: 11, weight: .semibold)).foregroundStyle(Color("cream").opacity(0.75))
        }
      }
      .containerBackground(for: .widget) {
        LinearGradient(colors: [Color("brandGreen"), Color("brandGreenDeep")], startPoint: .topLeading, endPoint: .bottomTrailing)
      }
    default: // systemSmall
      VStack(alignment: .leading, spacing: 6) {
        Image(systemName: "moon.stars.fill").foregroundStyle(Color("mint")).font(.system(size: 14))
        Text(text).font(.system(size: 12, weight: .medium, design: .serif))
          .foregroundStyle(Color("cream")).lineLimit(5).minimumScaleFactor(0.75)
        Spacer(minLength: 0)
        Text(source).font(.system(size: 10)).foregroundStyle(Color("cream").opacity(0.75)).lineLimit(1)
      }
      .containerBackground(for: .widget) {
        LinearGradient(colors: [Color("brandGreen"), Color("brandGreenDeep")], startPoint: .topLeading, endPoint: .bottomTrailing)
      }
    }
  }
}

struct RuhnevazDailyWidget: Widget {
  let kind = "RuhnevazDaily"
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: DailyProvider()) { entry in
      DailyWidgetView(entry: entry)
    }
    .configurationDisplayName(Store.lang == "tr" ? "Günün Nasibi" : "Daily Reflection")
    .description(Store.lang == "tr" ? "Her gün bir ayet, hadis veya hikmet." : "An ayah, hadith or wisdom every day.")
    .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .accessoryRectangular, .accessoryInline])
  }
}

// MARK: - Prayer widget

struct PrayerEntry: TimelineEntry {
  let date: Date
  let next: PrayerSlot?
  let today: PrayerDay?
  let location: String
  let labels: Labels
}

struct PrayerProvider: TimelineProvider {
  func placeholder(in context: Context) -> PrayerEntry {
    PrayerEntry(date: Date(), next: PrayerSlot(key: "Asr", name: "İkindi", date: Date().addingTimeInterval(3600)),
                today: PrayerDay(date: "2026-01-01", Fajr: "06:10", Sunrise: "07:40", Dhuhr: "13:05", Asr: "15:40", Maghrib: "18:10", Isha: "19:35", Imsak: nil, hijri: nil),
                location: "İstanbul", labels: Labels())
  }
  func getSnapshot(in context: Context, completion: @escaping (PrayerEntry) -> Void) {
    completion(entry(at: Date()))
  }
  func entry(at date: Date) -> PrayerEntry {
    let s = allSlots()
    let next = s.first { $0.date > date }
    return PrayerEntry(date: date, next: next, today: todayDay(), location: Store.prayer?.location ?? Store.labels.noLocation, labels: Store.labels)
  }
  func getTimeline(in context: Context, completion: @escaping (Timeline<PrayerEntry>) -> Void) {
    let s = allSlots()
    var entries: [PrayerEntry] = [entry(at: Date())]
    // One entry per upcoming prayer for the next ~2 days; the countdown itself is live via Text(timerInterval:)
    for slot in s.filter({ $0.date > Date() }).prefix(14) {
      entries.append(entry(at: slot.date.addingTimeInterval(1)))
    }
    completion(Timeline(entries: entries, policy: .after(Date().addingTimeInterval(6 * 3600))))
  }
}

struct PrayerWidgetView: View {
  @Environment(\.widgetFamily) var family
  let entry: PrayerEntry

  var timeText: String {
    guard let n = entry.next else { return "--:--" }
    let f = DateFormatter(); f.dateFormat = "HH:mm"; return f.string(from: n.date)
  }

  @ViewBuilder var countdown: some View {
    if let n = entry.next {
      Text(timerInterval: entry.date...n.date, countsDown: true)
        .monospacedDigit()
    } else {
      Text("--:--")
    }
  }

  var body: some View {
    switch family {
    case .accessoryCircular:
      ZStack {
        AccessoryWidgetBackground()
        VStack(spacing: 0) {
          Image(systemName: "moon.fill").font(.system(size: 11))
          Text(timeText).font(.system(size: 12, weight: .bold)).minimumScaleFactor(0.7)
        }
      }
    case .accessoryRectangular:
      VStack(alignment: .leading, spacing: 1) {
        HStack(spacing: 4) {
          Image(systemName: "moon.fill").font(.system(size: 10))
          Text((entry.next?.name ?? entry.labels.next).uppercased()).font(.system(size: 10, weight: .semibold))
        }.widgetAccentable()
        Text(timeText).font(.system(size: 20, weight: .bold)).minimumScaleFactor(0.8)
        countdown.font(.system(size: 11))
      }
    case .accessoryInline:
      if let n = entry.next {
        Label("\(n.name) \(timeText)", systemImage: "moon.fill")
      } else {
        Label(entry.labels.noLocation, systemImage: "moon.fill")
      }
    case .systemMedium:
      HStack(alignment: .top, spacing: 14) {
        VStack(alignment: .leading, spacing: 4) {
          Text(entry.labels.next.uppercased()).font(.system(size: 10, weight: .semibold)).tracking(1.5).foregroundStyle(Color("mint"))
          Text(entry.next?.name ?? "—").font(.system(size: 20, weight: .bold)).foregroundStyle(Color("ink"))
          Text(timeText).font(.system(size: 30, weight: .bold, design: .rounded)).foregroundStyle(Color("brandGreen"))
          countdown.font(.system(size: 12, weight: .medium)).foregroundStyle(Color("inkSoft"))
          Spacer(minLength: 0)
          Text(entry.location).font(.system(size: 10)).foregroundStyle(Color("inkSoft")).lineLimit(1)
        }
        Spacer()
        if let d = entry.today {
          VStack(alignment: .trailing, spacing: 5) {
            row(entry.labels.fajr, d.Fajr, "Fajr")
            row(entry.labels.dhuhr, d.Dhuhr, "Dhuhr")
            row(entry.labels.asr, d.Asr, "Asr")
            row(entry.labels.maghrib, d.Maghrib, "Maghrib")
            row(entry.labels.isha, d.Isha, "Isha")
          }
        }
      }
      .containerBackground(for: .widget) { Color("$widgetBackground") }
    default: // systemSmall
      VStack(alignment: .leading, spacing: 4) {
        HStack {
          Text(entry.labels.next.uppercased()).font(.system(size: 10, weight: .semibold)).tracking(1.5).foregroundStyle(Color("mint"))
          Spacer()
          Image(systemName: "moon.fill").foregroundStyle(Color("mint")).font(.system(size: 12))
        }
        Spacer(minLength: 0)
        Text(entry.next?.name ?? "—").font(.system(size: 18, weight: .bold)).foregroundStyle(Color("ink"))
        Text(timeText).font(.system(size: 30, weight: .bold, design: .rounded)).foregroundStyle(Color("brandGreen"))
        countdown.font(.system(size: 12, weight: .medium)).foregroundStyle(Color("inkSoft"))
      }
      .containerBackground(for: .widget) { Color("$widgetBackground") }
    }
  }

  func row(_ name: String, _ time: String, _ key: String) -> some View {
    let active = entry.next?.key == key
    return HStack(spacing: 8) {
      Text(name).font(.system(size: 11, weight: active ? .bold : .regular)).foregroundStyle(active ? Color("brandGreen") : Color("inkSoft"))
      Text(time).font(.system(size: 12, weight: active ? .bold : .medium, design: .rounded)).monospacedDigit()
        .foregroundStyle(active ? Color("brandGreen") : Color("ink"))
    }
  }
}

struct RuhnevazPrayerWidget: Widget {
  let kind = "RuhnevazPrayer"
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: PrayerProvider()) { entry in
      PrayerWidgetView(entry: entry)
    }
    .configurationDisplayName(Store.lang == "tr" ? "Namaz Vakti" : "Prayer Time")
    .description(Store.lang == "tr" ? "Sıradaki vakit ve geri sayım." : "Next prayer with a live countdown.")
    .supportedFamilies([.systemSmall, .systemMedium, .accessoryCircular, .accessoryRectangular, .accessoryInline])
  }
}

// MARK: - Bundle

@main
struct RuhnevazWidgetBundle: WidgetBundle {
  var body: some Widget {
    RuhnevazPrayerWidget()
    RuhnevazDailyWidget()
  }
}
