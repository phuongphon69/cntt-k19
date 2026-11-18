// app/huong-dan/page.tsx
import React from "react";
import Link from "next/link";
import {
  BookOpenCheck,
  CalendarDays,
  Clock,
  KeyRound,
  Lock,
  BarChart3,
  Wallet,
  BellRing,
  Smartphone,
  FileText,
  Video,
  HelpCircle,
} from "lucide-react";

export const metadata = {
  title: "Hướng dẫn sử dụng - CNTT K19 CĐ",
};

// ─── Hình minh họa nhỏ (dữ liệu mẫu, không phải dữ liệu thật) ────────────────
function Mock({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <figure className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-3 sm:p-4">
      <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 p-3 sm:p-4 text-xs">
        {children}
      </div>
      <figcaption className="mt-2 text-[11px] text-slate-500 text-center">{label} (hình minh họa, dữ liệu mẫu)</figcaption>
    </figure>
  );
}

function MockToday() {
  return (
    <Mock label="Thẻ lịch học hôm nay">
      <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm mb-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400" />
        Lịch học hôm nay
      </div>
      <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3 flex items-center justify-between gap-3">
        <div>
          <div className="font-bold text-slate-900 dark:text-white">Tên môn học</div>
          <div className="text-slate-500 mt-0.5">Giảng viên: Cô A • 19h00 - 21h30</div>
        </div>
        <span className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold whitespace-nowrap">Vào lớp Zoom</span>
      </div>
    </Mock>
  );
}

function MockMatrix() {
  const cell = (v: string, cls: string) => (
    <span className={`inline-flex w-7 h-7 items-center justify-center rounded-md font-bold ${cls}`}>{v}</span>
  );
  return (
    <Mock label="Bảng điểm danh một môn">
      <table className="w-full">
        <thead>
          <tr className="text-slate-500">
            <th className="text-left font-semibold pb-2">Học viên</th>
            <th className="pb-2">B1</th>
            <th className="pb-2">B2</th>
            <th className="pb-2">B3</th>
            <th className="pb-2">B4</th>
            <th className="pb-2">Tỷ lệ</th>
          </tr>
        </thead>
        <tbody className="text-center">
          <tr>
            <td className="text-left py-1 font-semibold text-slate-800 dark:text-slate-200">Học viên A</td>
            <td>{cell("X", "bg-emerald-100 text-emerald-700")}</td>
            <td>{cell("X", "bg-emerald-100 text-emerald-700")}</td>
            <td>{cell("M", "bg-amber-100 text-amber-700")}</td>
            <td>{cell("X", "bg-emerald-100 text-emerald-700")}</td>
            <td className="font-bold text-emerald-600">75%</td>
          </tr>
          <tr>
            <td className="text-left py-1 font-semibold text-slate-800 dark:text-slate-200">Học viên B</td>
            <td>{cell("X", "bg-emerald-100 text-emerald-700")}</td>
            <td>{cell("P", "bg-sky-100 text-sky-700")}</td>
            <td>{cell("V", "bg-rose-100 text-rose-700")}</td>
            <td>{cell("X", "bg-emerald-100 text-emerald-700")}</td>
            <td className="font-bold text-rose-600">50%</td>
          </tr>
        </tbody>
      </table>
    </Mock>
  );
}

function MockLock() {
  return (
    <Mock label="Màn hình nhập mã">
      <div className="text-center space-y-2">
        <Lock className="w-6 h-6 mx-auto text-indigo-500" />
        <div className="font-bold text-slate-900 dark:text-white">Liên hệ Lớp trưởng để được xem mục này</div>
        <div className="inline-block px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-bold">Liên hệ</div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-slate-400 text-left">Nhập mã</div>
        <div className="text-slate-500">Để được xem thống kê</div>
      </div>
    </Mock>
  );
}

function MockNotify() {
  return (
    <Mock label="Thông báo trên màn hình khóa điện thoại">
      <div className="rounded-xl bg-slate-100 dark:bg-slate-800 p-3 flex gap-3 items-start">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
          <BellRing className="w-4 h-4" />
        </div>
        <div>
          <div className="font-bold text-slate-900 dark:text-white">⏰ Còn 30 phút đến giờ học: Tên môn học</div>
          <div className="text-slate-500">19:00 - 21:30 • Cô A</div>
        </div>
      </div>
    </Mock>
  );
}

// ─── Nội dung hướng dẫn ───────────────────────────────────────────────────────
interface GuideSection {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  summary: string;
  steps: React.ReactNode[];
  mock?: React.ReactNode;
  tip?: string;
}

const sections: GuideSection[] = [
  {
    id: "lich-hoc",
    icon: Clock,
    title: "Xem lịch học hôm nay và vào lớp Zoom",
    summary: "Biết ngay hôm nay học môn gì, mấy giờ, và vào lớp chỉ với một chạm.",
    steps: [
      <>Mở trang <strong>Hôm nay</strong> trên thanh menu (trên điện thoại là thanh biểu tượng phía dưới).</>,
      <>Xem thẻ <strong>Lịch học hôm nay</strong>: tên môn, giảng viên, giờ học và đồng hồ đếm ngược.</>,
      <>Bấm nút <strong>Vào lớp Zoom</strong> để mở thẳng phòng học. Nếu thấy "Chưa có link trực tuyến", link chưa được cập nhật trong thời khóa biểu, hãy báo Lớp trưởng.</>,
    ],
    mock: <MockToday />,
  },
  {
    id: "thoi-khoa-bieu",
    icon: CalendarDays,
    title: "Xem thời khóa biểu cả kỳ",
    summary: "Toàn bộ lịch học các môn, theo ngày và theo tuần.",
    steps: [
      <>Mở trang <strong>Thời khóa biểu</strong>.</>,
      <>Chọn tháng hoặc tuần cần xem. Mỗi buổi hiển thị môn học, giảng viên và giờ học.</>,
      <>Bấm vào buổi học để lấy link Zoom hoặc thêm lịch vào Google Calendar (nếu có).</>,
    ],
    tip: "Thời khóa biểu tự cập nhật khi Lớp trưởng sửa trong Google Sheets, bạn không cần làm gì thêm.",
  },
  {
    id: "nhap-ma",
    icon: KeyRound,
    title: "Nhập mã để xem Môn học, Thống kê và Quỹ lớp",
    summary: "Ba mục này được bảo vệ. Có mã do Lớp trưởng cấp thì mới xem được.",
    steps: [
      <>Bấm vào mục <strong>Môn học</strong>, <strong>Thống kê</strong> hoặc <strong>Quỹ lớp</strong>.</>,
      <>Nếu thấy thông báo <strong>"Liên hệ Lớp trưởng để được xem mục này"</strong>, bấm nút <strong>Liên hệ</strong> để hiện số điện thoại Lớp trưởng và xin mã.</>,
      <>Gõ mã vào ô <strong>Nhập mã</strong> (hoa hay thường đều được) rồi bấm nút xem.</>,
      <>Nhập đúng một lần là xem được cả ba mục trên thiết bị đó trong khoảng 30 ngày.</>,
    ],
    mock: <MockLock />,
    tip: "Mã chỉ dành cho thành viên lớp, vui lòng không chia sẻ ra ngoài.",
  },
  {
    id: "diem-danh",
    icon: BookOpenCheck,
    title: "Xem điểm danh theo từng môn",
    summary: "Mỗi buổi học có một kết quả, tỷ lệ chuyên cần tự tính.",
    steps: [
      <>Vào <strong>Môn học</strong> (cần mã), chọn môn muốn xem rồi bấm <strong>Xem bảng điểm danh</strong>.</>,
      <>Mỗi cột là một buổi học (B1, B2…), mỗi hàng là một học viên. Gõ tên vào ô tìm để tìm nhanh.</>,
      <>Đọc kết quả: <strong>X</strong> có mặt, <strong>P</strong> có phép, <strong>M</strong> đi muộn, <strong>V</strong> vắng. Chỉ X được tính là có mặt.</>,
      <>Cột <strong>Tỷ lệ</strong> cho biết số buổi có mặt trên số buổi đã học. Dưới 80% sẽ được đánh dấu cảnh báo.</>,
    ],
    mock: <MockMatrix />,
    tip: "Dấu “–” ở một buổi nghĩa là bạn chưa vào lớp ở thời điểm đó nên buổi đó không bị tính.",
  },
  {
    id: "thong-ke",
    icon: BarChart3,
    title: "Xem thống kê chuyên cần và xuất PDF",
    summary: "Nhìn toàn lớp theo từng môn, lọc nhanh và lưu thành file PDF.",
    steps: [
      <>Mở <strong>Thống kê</strong> (cần mã). Phía trên là các chỉ số chung của lớp.</>,
      <>Chọn <strong>môn học</strong>, lọc <strong>Tốt (≥ 80%)</strong> hoặc <strong>Cảnh báo (&lt; 80%)</strong>, hoặc gõ tên để tìm.</>,
      <>Bấm <strong>Xem nhanh PDF</strong> để xem trước bản in theo đúng bộ lọc đang chọn.</>,
      <>Bấm <strong>Xuất PDF</strong>, trong hộp thoại in chọn <strong>Lưu dưới dạng PDF</strong> để lưu file.</>,
    ],
    tip: "Muốn file PDF chỉ có một môn, hãy chọn môn đó trước khi bấm Xem nhanh PDF.",
  },
  {
    id: "quy-lop",
    icon: Wallet,
    title: "Xem quỹ lớp",
    summary: "Số dư, khoản thu, khoản chi và tình hình đóng quỹ của từng người.",
    steps: [
      <>Mở <strong>Quỹ lớp</strong> (cần mã). Đầu trang là <strong>số dư quỹ</strong> và tiến độ thu.</>,
      <>Tab <strong>Đóng quỹ</strong>: xem ai đã đủ, ai còn thiếu (tick “Chỉ người chưa đủ” để lọc).</>,
      <>Tab <strong>Thu</strong> và <strong>Chi</strong>: xem từng khoản, mới nhất ở trên. Tab <strong>Theo tháng</strong>: tổng hợp thu chi từng tháng.</>,
    ],
    tip: "Số liệu lấy tự động từ sổ quỹ lớp, nếu thấy sai hãy báo Lớp trưởng để sửa trong sổ.",
  },
  {
    id: "thong-bao",
    icon: BellRing,
    title: "Bật thông báo nhắc giờ học",
    summary: "Nhận nhắc trước giờ học 30 phút và 10 phút, kể cả khi đã đóng ứng dụng.",
    steps: [
      <>Ở trang <strong>Hôm nay</strong> hoặc <strong>Tổng quan</strong>, tìm hộp <strong>Thông báo nhắc giờ học</strong>.</>,
      <>Bấm nút bật và chọn <strong>Cho phép</strong> khi trình duyệt hỏi quyền thông báo.</>,
      <>Khi thấy dòng “Thiết bị này sẽ nhận thông báo cả khi đã đóng app” là xong.</>,
    ],
    mock: <MockNotify />,
    tip: "Trên iPhone, hãy thêm web vào Màn hình chính (mục bên dưới) rồi mở từ biểu tượng đó mới nhận được thông báo (iOS 16.4 trở lên).",
  },
  {
    id: "cai-app",
    icon: Smartphone,
    title: "Cài web lên màn hình chính như một ứng dụng",
    summary: "Mở nhanh chỉ với một biểu tượng, không cần gõ địa chỉ.",
    steps: [
      <><strong>Android (Chrome):</strong> bấm nút <strong>Cài App</strong> trên web, hoặc menu ⋮ của Chrome → <strong>Cài đặt ứng dụng</strong> / <strong>Thêm vào màn hình chính</strong>.</>,
      <><strong>iPhone (Safari):</strong> bấm biểu tượng <strong>Chia sẻ</strong> (hình vuông có mũi tên lên) → <strong>Thêm vào Màn hình chính</strong>.</>,
      <>Mở từ biểu tượng mới trên màn hình chính. Từ đó dùng như một ứng dụng bình thường.</>,
    ],
  },
];

const faqs = [
  {
    q: "Tôi không có mã thì làm sao?",
    a: "Bấm nút Liên hệ trên màn hình khóa để lấy số điện thoại Lớp trưởng và xin mã. Các mục Hôm nay, Thời khóa biểu vẫn xem được không cần mã.",
  },
  {
    q: "Số liệu điểm danh trên web khác với sổ của tôi?",
    a: "Web đọc trực tiếp từ Google Sheets của lớp. Hãy báo Lớp trưởng kiểm tra lại buổi bị lệch; khi sheet sửa xong, web tự cập nhật sau ít phút.",
  },
  {
    q: "Web hiện kết quả cũ dù sheet đã sửa?",
    a: "Web lưu tạm dữ liệu vài chục giây. Hãy tải lại trang (kéo xuống để làm mới trên điện thoại) sau khoảng một phút.",
  },
  {
    q: "Tôi bấm “Cho phép thông báo” nhưng không thấy nhận được?",
    a: "Kiểm tra thông báo của trình duyệt chưa bị tắt trong cài đặt điện thoại. Trên iPhone cần mở web từ biểu tượng ở Màn hình chính. Hệ thống chỉ nhắc cho những buổi có trong thời khóa biểu.",
  },
];

export default function GuidePage() {
  return (
    <div className="container mx-auto px-4 sm:px-6 pt-6 max-w-4xl space-y-8">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Video className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Hướng dẫn sử dụng</h1>
        </div>
        <p className="text-sm text-slate-500">
          Các thao tác thường dùng trên hệ thống Điểm danh & Thời khóa biểu lớp CNTT - K19 CĐ. Bấm vào mục bạn cần để đọc ngay.
        </p>
      </div>

      {/* Mục lục */}
      <nav className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {sections.map((s, i) => {
          const Icon = s.icon;
          return (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
            >
              <span className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4" />
              </span>
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {i + 1}. {s.title}
              </span>
            </a>
          );
        })}
      </nav>

      {/* Các phần hướng dẫn */}
      <div className="space-y-6">
        {sections.map((s, i) => {
          const Icon = s.icon;
          return (
            <section
              key={s.id}
              id={s.id}
              className="scroll-mt-24 p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-4"
            >
              <div className="flex items-start gap-3">
                <span className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">
                    {i + 1}. {s.title}
                  </h2>
                  <p className="text-sm text-slate-500 mt-0.5">{s.summary}</p>
                </div>
              </div>

              <div className={s.mock ? "grid grid-cols-1 md:grid-cols-2 gap-5 items-start" : ""}>
                <ol className="space-y-3">
                  {s.steps.map((step, idx) => (
                    <li key={idx} className="flex gap-3 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
                {s.mock}
              </div>

              {s.tip && (
                <div className="flex gap-2 text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/50 rounded-xl px-3.5 py-2.5">
                  <span className="font-bold shrink-0">Mẹo:</span>
                  <span>{s.tip}</span>
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* Hỏi đáp */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Câu hỏi thường gặp</h2>
        </div>
        <div className="space-y-2">
          {faqs.map((f) => (
            <details
              key={f.q}
              className="group rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 px-4 py-3"
            >
              <summary className="cursor-pointer text-sm font-semibold text-slate-800 dark:text-slate-200 list-none flex items-center justify-between gap-3">
                <span>{f.q}</span>
                <span className="text-slate-400 group-open:rotate-45 transition-transform text-lg leading-none">+</span>
              </summary>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <div className="flex items-center justify-center gap-2 pb-4">
        <FileText className="w-4 h-4 text-slate-400" />
        <Link href="/" className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
          Quay lại trang chủ
        </Link>
      </div>
    </div>
  );
}
