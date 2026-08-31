import { useEffect, useState, type ChangeEvent } from "react";

type DateTextInputProps = {
  value: string; // ISO yyyy-mm-dd o ""
  onChange: (isoValue: string) => void;
  placeholder?: string;
};

function isoToDisplay(iso: string) {
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return "";
  return `${day}/${month}/${year}`;
}

function digitsToDisplay(digits: string) {
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  let display = day;
  if (month) display += `/${month}`;
  if (year) display += `/${year}`;
  return display;
}

function digitsToIso(digits: string) {
  if (digits.length !== 8) return "";
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  if (Number(day) < 1 || Number(day) > 31 || Number(month) < 1 || Number(month) > 12) return "";
  return `${year}-${month}-${day}`;
}

// Fecha escrita a mano tipo "27/08/2027" en vez del selector nativo del
// navegador (mismo componente que ya se uso en frontend-carnet). Mientras
// la fecha esta a medio escribir no se avisa al padre; recien se avisa
// cuando quedan los 8 digitos completos, o cuando se borra todo.
export function DateTextInput({ value, onChange, placeholder = "DD/MM/AAAA" }: DateTextInputProps) {
  const [display, setDisplay] = useState(() => isoToDisplay(value));

  useEffect(() => {
    setDisplay(isoToDisplay(value));
  }, [value]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const digits = event.target.value.replace(/\D/g, "").slice(0, 8);
    const nextDisplay = digitsToDisplay(digits);
    setDisplay(nextDisplay);

    if (digits.length === 0) {
      onChange("");
      return;
    }

    if (digits.length === 8) {
      const iso = digitsToIso(digits);
      if (iso) onChange(iso);
    }
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={display}
      onChange={handleChange}
      placeholder={placeholder}
      maxLength={10}
    />
  );
}
