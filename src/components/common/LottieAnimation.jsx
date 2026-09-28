import { useEffect, useRef, useState } from "react";
import url404 from "../../assets/lottie/404.json?url";
import urlSuccess from "../../assets/lottie/success_lottie.json?url";

const SOURCES = {
  "404": url404,
  success: urlSuccess,
};

let playerPromise = null;
const dataCache = new Map();

import lottie from 'lottie-web';
function loadPlayer() {
  return Promise.resolve(lottie);

  if (!playerPromise) {
    playerPromise = import("lottie-web").then((m) => m.default || m);
  }
  return playerPromise;
}

function loadData(url) {
  if (!dataCache.has(url)) {
    dataCache.set(
      url,
      fetch(url)
        .then((r) => {
          if (!r.ok) throw new Error(String(r.status));
          return r.json();
        })
        .catch((err) => {
          dataCache.delete(url);
          throw err;
        })
    );
  }
  return dataCache.get(url);
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export default function LottieAnimation({
  name = "success",
  width = 120,
  height = null,
  aspect = null,
  autoplay = true,
  loop = true,
  speed = 1,
  onFinish = null,
  onReady = null,
  onFail = null,
  className = "",
  style = {},
}) {
  const hostRef = useRef(null);
  const animRef = useRef(null);
  const finishRef = useRef(null);
  const readyRef = useRef(null);
  const failRef = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    readyRef.current = onReady;
    failRef.current = onFail;
  }, [onReady, onFail]);

  useEffect(() => {
    finishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    let cancelled = false;
    const url = SOURCES[name];
    if (!url || !hostRef.current) return undefined;

    (async () => {
      try {
        const [lottie, data] = await Promise.all([loadPlayer(), loadData(url)]);
        if (cancelled || !hostRef.current) return;

        const reduced = prefersReducedMotion();
        const anim = lottie.loadAnimation({
          container: hostRef.current,
          renderer: "svg",
          loop: reduced ? false : loop,
          autoplay: !reduced && autoplay,
          animationData: data,
          rendererSettings: {
            preserveAspectRatio: "xMidYMid meet",
            progressiveLoad: true,
          },
        });

        anim.setSpeed(speed);
        if (reduced) anim.goToAndStop(0, true);

        anim.addEventListener("complete", () => {
          if (loop) return;
          anim.goToAndStop(0, true);
          if (typeof finishRef.current === "function") finishRef.current();
        });

        animRef.current = anim;

        if (typeof readyRef.current === "function") readyRef.current();
      } catch {
        if (!cancelled) {
          setFailed(true);
          if (typeof failRef.current === "function") failRef.current();
        }
      }
    })();

    return () => {
      cancelled = true;
      if (animRef.current) {
        animRef.current.destroy();
        animRef.current = null;
      }
    };
  }, [name, loop, autoplay, speed]);

  if (failed) return null;

  const box =
    typeof width === "string"
      ? { width, height: height == null ? undefined : height }
      : typeof width === "number"
        ? { width, height: height == null ? width : height }
        : { width: width?.width, height: width?.height };

  return (
    <div
      ref={hostRef}
      className={`lottie-host ${className}`.trim()}
      role="img"
      aria-label={`${name} animation`}
      style={{
        width: box.width,
        height: aspect ? "auto" : box.height,
        aspectRatio: aspect || undefined,
        maxWidth: "100%",
        maxHeight: "100%",
        overflow: "hidden",
        pointerEvents: "none",
        ...style,
      }}
    />
  );
}
