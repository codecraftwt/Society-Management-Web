import LottieAnimation from "./LottieAnimation";

export default function SuccessAnimation({ size = 180, caption = "", style = {} }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        ...style,
      }}
    >
      <LottieAnimation
        name="success"
        width={size}
        height={Math.round(size * 1.06)}
        loop={false}
        speed={1}
      />
      {caption ? (
        <p
          style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 700,
            color: "var(--text-primary, #f8fafc)",
            textAlign: "center",
          }}
        >
          {caption}
        </p>
      ) : null}
    </div>
  );
}
