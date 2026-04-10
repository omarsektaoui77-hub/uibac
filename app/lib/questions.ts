export const selectQuestions = (category: string | null) => {
  const banks: Record<string, any[]> = {
    "math": [
      { q: "Derivative of x²?", options: ["x", "2x", "x²", "2"], correct: "2x" },
      { q: "Integral of 2x?", options: ["x", "2x²", "x²", "x³"], correct: "x²" },
      { q: "Value of sin(90°)?", options: ["0", "1", "-1", "undefined"], correct: "1" }
    ],
    "physics": [
      { q: "Speed formula?", options: ["d/t", "t/d", "d*t", "v²"], correct: "d/t" },
      { q: "Unit of Force?", options: ["Joule", "Newton", "Watt", "Pascal"], correct: "Newton" },
      { q: "Gravity acceleration?", options: ["9.8 m/s²", "10 m/s", "8.9 m/s²", "11 m/s²"], correct: "9.8 m/s²" }
    ],
    "chemistry": [
      { q: "Atomic number of O?", options: ["6", "7", "8", "9"], correct: "8" },
      { q: "pH of pure water?", options: ["5", "6", "7", "8"], correct: "7" },
      { q: "Formula for Methane?", options: ["CH4", "CO2", "H2O", "NH3"], correct: "CH4" }
    ],
    "boss": [
      { q: "Derivative of e^x?", options: ["x*e^x", "e^x", "ln(x)", "1/x"], correct: "e^x" },
      { q: "Energy of a photon?", options: ["E=mc²", "E=hf", "E=1/2mv²", "E=mgh"], correct: "E=hf" }
    ]
  };

  return banks[category || "math"] || banks["math"];
};
