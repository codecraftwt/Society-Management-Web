
import API from "../../services/api";

export default function AdminEmergencyModal({
  alerts,
  isOpen,
  onClose,
  refresh
}) {
  if (!isOpen) return null;

  const resolveAlert = async (id) => {
    try {
      await API.patch(`/emergency/${id}/resolve`);
      refresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: "var(--overlay-strong)", backdropFilter: "blur(8px)" }}>

      {/* RED AMBIENT GLOW */}
      <div className="absolute w-175 h-62.5 bg-red-600/20 blur-[120px] rounded-full pointer-events-none"></div>

      {/* MODAL CONTAINER */}
      <div className="relative emergency-modal-bg rounded-2xl w-full max-w-md flex flex-col shadow-xl"
           style={{
             background: "var(--modal-bg)",
             border: "1px solid var(--glass-border)",
             backdropFilter: "var(--blur)",
           }}>

        {/* ER */}
        <div className="flex justify-between items-center p-5"
             style={{ borderBottom: "1px solid var(--divider)" }}>
          <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
            Emergency Alert 🚨
          </h2>

          <button
            onClick={onClose}
            className="text-xl transition-opacity hover:opacity-100 opacity-60"
            style={{ color: "var(--text-primary)" }}
          >
            ✕
          </button>
        </div>

        {/* BODY */}
        <div className="p-5 max-h-[70vh] overflow-y-auto space-y-4 scrollbar-hide">

          {alerts.length === 0 ? (
            <p className="text-secondary">No active emergencies</p>
          ) : (
            alerts.map((a) => (
              <div
                key={a.id}
                className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 space-y-2"
              >

                {/* TYPE */}
                <p className="text-red-400 font-semibold tracking-wide">
                  {a.type}
                </p>

                {/* MESSAGE */}
                <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                  {a.message}
                </p>

                {/* SOURCE */}
                <p className="text-xs text-secondary">
                  Raised By:{" "}
                  {a.source === "RESIDENT"
                    ? a.Resident?.name || "Resident"
                    : "Guard"}
                </p>

                {/* FLAT */}
                {a.source === "RESIDENT" && a.Flat && (
                  <p className="text-xs text-secondary">
                    Flat:{" "}
                    {a.Flat?.Block?.name}-{a.Flat?.flat_number}
                  </p>
                )}

                {/* TIME */}
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {new Date(a.created_at).toLocaleString()}
                </p>

                {/* BUTTON */}
                <button
                  onClick={() => resolveAlert(a.id)}
                  className="btn-primary w-full mt-2"
                >
                  Mark as Resolved
                </button>

              </div>
            ))
          )}

        </div>

      </div>
    </div>
  );
}