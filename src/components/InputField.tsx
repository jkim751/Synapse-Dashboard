"use client";

import { FieldError } from "react-hook-form";
import { useState, useEffect } from "react";

type InputFieldProps = {
  label: string;
  type?: string;
  register: any;
  name: string;
  defaultValue?: string;
  error?: FieldError;
  hidden?: boolean;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
  options?: { value: string; label: string }[];
};

const HOURS_12 = ["1","2","3","4","5","6","7","8","9","10","11","12"];
const MINUTES = ["00", "15", "30", "45"];

function to12h(h24: number): { hour: string; period: "AM" | "PM" } {
  if (h24 === 0) return { hour: "12", period: "AM" };
  if (h24 < 12) return { hour: String(h24), period: "AM" };
  if (h24 === 12) return { hour: "12", period: "PM" };
  return { hour: String(h24 - 12), period: "PM" };
}

function to24h(hour: string, period: "AM" | "PM"): number {
  const h = parseInt(hour, 10);
  if (period === "AM") return h === 12 ? 0 : h;
  return h === 12 ? 12 : h + 12;
}

function SplitDateTimeInput({
  name,
  register,
  defaultValue,
}: {
  name: string;
  register: any;
  defaultValue?: string;
}) {
  const rawTime = defaultValue?.slice(11, 16) ?? "09:00";
  const [hStr, mStr] = rawTime.split(":");
  const init12 = to12h(parseInt(hStr ?? "9", 10));

  const [datePart, setDatePart] = useState(defaultValue?.slice(0, 10) ?? "");
  const [hour, setHour] = useState(init12.hour);
  const [min, setMin] = useState(MINUTES.includes(mStr) ? mStr : "00");
  const [period, setPeriod] = useState<"AM" | "PM">(init12.period);

  const h24 = String(to24h(hour, period)).padStart(2, "0");
  const combined = datePart ? `${datePart}T${h24}:${min}` : "";

  const { onChange, ref, ...rest } = register(name);

  useEffect(() => {
    onChange({ target: { name, value: combined } });
  }, [combined]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectClass = "ring-[1.5px] ring-gray-300 p-2 rounded-xl text-sm flex-1";

  return (
    <div className="flex flex-col gap-1 w-full">
      <input
        type="date"
        value={datePart}
        onChange={(e) => setDatePart(e.target.value)}
        className="ring-[1.5px] ring-gray-300 p-2 rounded-xl text-sm w-full"
      />
      <div className="flex items-center gap-1">
        <select value={hour} onChange={(e) => setHour(e.target.value)} className={selectClass}>
          {HOURS_12.map((h) => <option key={h} value={h}>{h}</option>)}
        </select>
        <span className="text-gray-400 font-medium text-sm">:</span>
        <select value={min} onChange={(e) => setMin(e.target.value)} className={selectClass}>
          {MINUTES.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={period} onChange={(e) => setPeriod(e.target.value as "AM" | "PM")} className={selectClass}>
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
      <input type="hidden" {...rest} ref={ref} value={combined} readOnly />
    </div>
  );
}

const InputField = ({
  label,
  type = "text",
  register,
  name,
  defaultValue,
  error,
  hidden,
  inputProps,
  options,
}: InputFieldProps) => {
  if (type === "select") {
    return (
      <div className={hidden ? "hidden" : "flex flex-col gap-2 w-full md:w-1/4"}>
        <label className="text-xs text-gray-500">{label}</label>
        <select
          className="ring-[1.5px] ring-gray-300 p-2 rounded-xl text-sm w-full"
          {...register(name)}
          defaultValue={defaultValue}
        >
          <option value="">Select {label}</option>
          {options?.map((option) => (
            <option value={option.value} key={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error?.message && (
          <p className="text-xs text-red-400">{error.message.toString()}</p>
        )}
      </div>
    );
  }

  if (type === "datetime-local") {
    return (
      <div className={hidden ? "hidden" : "flex flex-col gap-2 w-full md:w-1/4"}>
        <label className="text-xs text-gray-500">{label}</label>
        <SplitDateTimeInput
          name={name}
          register={register}
          defaultValue={defaultValue}
        />
        {error?.message && (
          <p className="text-xs text-red-400">{error.message.toString()}</p>
        )}
      </div>
    );
  }

  return (
    <div className={hidden ? "hidden" : "flex flex-col gap-2 w-full md:w-1/4"}>
      <label className="text-xs text-gray-500">{label}</label>
      <input
        type={type}
        {...register(name)}
        className="ring-[1.5px] ring-gray-300 p-2 rounded-xl text-sm w-full"
        {...inputProps}
        defaultValue={defaultValue}
      />
      {error?.message && (
        <p className="text-xs text-red-400">{error.message.toString()}</p>
      )}
    </div>
  );
};

export default InputField;
