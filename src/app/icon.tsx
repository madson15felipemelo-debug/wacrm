import { ImageResponse } from "next/og";

// Replaces the default Next.js favicon with the LUMA brand mark — deep
// indigo rounded square carrying the magenta firefly spark, matching
// the rail logo in `src/components/layout/sidebar.tsx`. Next.js renders
// this at build time and auto-injects <link rel="icon"> into <head>.
//
// Drawn as inline SVG rather than referencing /brand/luma-mark.png so
// the route stays edge-renderable with no filesystem read.
//
// This route takes precedence over src/app/favicon.ico, which is the
// Next.js default and can stay on disk harmlessly (or be removed).

export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          // LUMA rail indigo → magenta, the brand's signature sweep.
          background:
            "linear-gradient(140deg, #1b1437 0%, #4d1a70 55%, #c23a7b 100%)",
          borderRadius: 7,
        }}
      >
        {/* Four-point spark — the glow at the heart of the LUMA mark. */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="#ffffff"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M12 1.6c.9 4.6 2.4 7.6 5.2 8.9-2.8 1.3-4.3 4.3-5.2 8.9-.9-4.6-2.4-7.6-5.2-8.9C9.6 9.2 11.1 6.2 12 1.6z" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
