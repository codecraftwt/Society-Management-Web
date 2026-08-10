
import Modal from "../Modal";

export default function GuardEmergencyModal({
  alerts,
  isOpen,
  onClose
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="🚨 Active Emergencies">

      {alerts.length === 0 ? (
        <p className="text-secondary text-sm">
          No active emergency
        </p>
      ) : (
        <div className="space-y-4">

          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="bg-red-500/10 border border-red-500/30 p-4 rounded-lg"
            >

              {/* TYPE */}
              <p className="font-semibold text-red-400">
                {alert.type}
              </p>

              {/* MESSAGE */}
              <p className="text-sm mt-1" style={{ color: "var(--text-primary)" }}>
                {alert.message}
              </p>

              {/* SOURCE */}
              <p className="text-xs text-secondary mt-1">
                Raised By:{" "}
                {alert.source === "RESIDENT"
                  ? alert.Resident?.name || "Resident"
                  : "Guard"}
              </p>

              {/* FLAT ONLY FOR RESIDENT */}
              {alert.source === "RESIDENT" && alert.Flat && (
                <p className="text-xs text-secondary">
                  Flat:{" "}
                  {alert.Flat?.Block?.name}-{alert.Flat?.flat_number}
                </p>
              )}

              {/* TIME */}
              <p className="text-xs text-secondary mt-1">
                {new Date(alert.created_at).toLocaleString()}
              </p>

            </div>
          ))}

        </div>
      )}

    </Modal>
  );
}