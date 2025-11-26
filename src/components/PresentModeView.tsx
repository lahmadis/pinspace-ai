"use client";

import type { Pin } from "@/types";

interface PresentModeViewProps {
  pins: Pin[];
  onExit: () => void;
}

const GROUPS = ["Facade language", "Circulation", "Structure", "Material"];

export default function PresentModeView({ pins, onExit }: PresentModeViewProps) {
  const getPinsByGroup = (group: string) => {
    return pins.filter((pin) => pin.group === group);
  };

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
      {/* Exit Button */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={onExit}
          className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition"
        >
          Exit Present Mode
        </button>
      </div>

      {/* Centered Content */}
      <div className="max-w-7xl mx-auto p-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-8 text-center">
          Board – Concept Development
        </h1>

        {/* Pins Grid */}
        <div className="grid grid-cols-4 gap-8">
          {GROUPS.map((group) => (
            <div key={group} className="flex flex-col">
              <h2 className="text-2xl font-semibold text-gray-800 mb-6 pb-3 border-b-2 border-gray-300">
                {group}
              </h2>
              <div className="space-y-6">
                {getPinsByGroup(group).map((pin) => (
                  <div
                    key={pin.id}
                    className="bg-white border-2 border-gray-300 rounded-lg p-6 shadow-lg"
                  >
                    <div className="bg-gray-200 px-3 py-1 rounded text-sm text-gray-700 mb-3 inline-block">
                      {pin.header}
                    </div>
                    <p className="text-base text-gray-800 leading-relaxed">{pin.body}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

