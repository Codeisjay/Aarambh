// FeedbackRow.jsx
export default function FeedbackRow({ text, type = "info" }) {
  const styles = {
    info: "bg-blue-900/30 border-blue-700 text-blue-300",
    success: "bg-green-900/30 border-green-700 text-green-400",
    warn: "bg-yellow-900/30 border-yellow-700 text-yellow-400",
    danger: "bg-red-900/30 border-red-700 text-red-400",
  };

  return (
    <div className={`rounded-xl border px-4 py-3 ${styles[type]}`}>
      {text}
    </div>
  );
}
