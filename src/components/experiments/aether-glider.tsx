"use client";

import React from "react";
import { AetherGliderGame } from "./aether-glider/components/AetherGliderGame";

export function AetherGlider() {
  return (
    <div className="w-full flex flex-col items-center">
      {/* Game Frame Container */}
      <div className="w-full h-[680px] sm:h-[780px] lg:h-[860px] max-h-[92vh] min-h-[580px] rounded-2xl overflow-hidden border border-amber-600/40 shadow-[0_0_50px_rgba(245,158,11,0.15)] bg-[#0F1326] relative">
        <AetherGliderGame className="w-full h-full" />
      </div>
    </div>
  );
}

export { AetherGliderGame };
