"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import DateTimeInput from "./ui/DateTimeInput";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { sydneyLocalToUTC } from "@/lib/dateUtils";

const DAYS = [
  { label: "Mon", value: "MO" },
  { label: "Tue", value: "TU" },
  { label: "Wed", value: "WE" },
  { label: "Thu", value: "TH" },
  { label: "Fri", value: "FR" },
  { label: "Sat", value: "SA" },
  { label: "Sun", value: "SU" },
];

/** Build an RRule string from the recurrence form values */
function buildRRule(
  freq: "WEEKLY" | "DAILY",
  days: string[],
  until: string // datetime-local string e.g. "2026-06-30T17:00"
): string {
  const parts: string[] = [`FREQ=${freq}`];
  if (freq === "WEEKLY" && days.length > 0) {
    parts.push(`BYDAY=${days.join(",")}`);
  }
  if (until) {
    // Convert local datetime-local string to UTC RRULE UNTIL format
    const d = new Date(until);
    if (!isNaN(d.getTime())) {
      const pad = (n: number) => String(n).padStart(2, "0");
      parts.push(
        `UNTIL=${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`
      );
    }
  }
  return `RRULE:${parts.join(";")}`;
}

const schema = z
  .object({
    type: z.enum(["event", "shift"]),
    title: z.string().min(1, "Title is required"),
    description: z.string().min(1, "Description is required"),
    startTime: z.string().min(1, "Start time is required"),
    endTime: z.string().min(1, "End time is required"),
  })
  .refine((d) => new Date(d.endTime) > new Date(d.startTime), {
    message: "End time must be after start time",
    path: ["endTime"],
  });

type FormValues = z.infer<typeof schema>;

const AddEventModal = ({ onSuccess }: { onSuccess?: () => void } = {}) => {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Recurrence state (only used when type === "shift")
  const [recurring, setRecurring] = useState(false);
  const [freq, setFreq] = useState<"WEEKLY" | "DAILY">("WEEKLY");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [until, setUntil] = useState("");

  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: "event" },
  });

  const selectedType = watch("type");
  const isShift = selectedType === "shift";
  const watchedStart = watch("startTime") ?? "";
  const watchedEnd = watch("endTime") ?? "";

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const onSubmit = async (data: FormValues) => {
    // Validate recurrence fields if recurring shift
    if (isShift && recurring) {
      if (freq === "WEEKLY" && selectedDays.length === 0) {
        setServerError("Select at least one day for weekly recurrence");
        return;
      }
      if (!until) {
        setServerError("An end date is required for recurring shifts");
        return;
      }
    }

    setSubmitting(true);
    setServerError(null);

    const rrule =
      isShift && recurring ? buildRRule(freq, selectedDays, until) : undefined;

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          startTime: sydneyLocalToUTC(data.startTime),
          endTime: sydneyLocalToUTC(data.endTime),
          rrule,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        setServerError(json.error ?? "Failed to save");
        return;
      }

      handleClose();
      onSuccess?.();
      router.refresh();
    } catch {
      setServerError("An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    setServerError(null);
    setRecurring(false);
    setFreq("WEEKLY");
    setSelectedDays([]);
    setUntil("");
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-xl transition-colors"
      >
        <span className="text-base leading-none">+</span>
        Add
      </button>

      {open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-semibold text-gray-800">
                Add {isShift ? "Shift" : "Event"}
              </h2>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Type toggle */}
            <div className="flex bg-gray-100 rounded-xl p-1 mb-5">
              {(["event", "shift"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setValue("type", t);
                    if (t !== "shift") setRecurring(false);
                  }}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-xl transition-colors ${
                    selectedType === t
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {t === "event" ? "Event" : "Shift / Schedule"}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <input type="hidden" {...register("type")} />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isShift ? "Shift name" : "Title"}
                </label>
                <input
                  {...register("title")}
                  placeholder={isShift ? "e.g. Admin Cover – Front Desk" : "e.g. Staff Meeting"}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                {errors.title && (
                  <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isShift ? "Notes" : "Description"}
                </label>
                <textarea
                  {...register("description")}
                  rows={2}
                  placeholder={
                    isShift
                      ? "e.g. Cover reception, answer phones"
                      : "Brief description of the event"
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                />
                {errors.description && (
                  <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isShift && recurring ? "First occurrence" : "Start"}
                  </label>
                  <DateTimeInput
                    value={watchedStart}
                    onChange={(v) => setValue("startTime", v, { shouldValidate: true })}
                  />
                  {errors.startTime && (
                    <p className="text-red-500 text-xs mt-1">{errors.startTime.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End</label>
                  <DateTimeInput
                    value={watchedEnd}
                    onChange={(v) => setValue("endTime", v, { shouldValidate: true })}
                  />
                  {errors.endTime && (
                    <p className="text-red-500 text-xs mt-1">{errors.endTime.message}</p>
                  )}
                </div>
              </div>

              {/* Recurrence — shifts only */}
              {isShift && (
                <div className="border border-gray-200 rounded-xl p-4 space-y-4">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={recurring}
                      onChange={(e) => setRecurring(e.target.checked)}
                      className="w-4 h-4 accent-orange-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Repeating shift</span>
                  </label>

                  {recurring && (
                    <div className="space-y-4">
                      {/* Frequency */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Repeats
                        </label>
                        <div className="flex bg-gray-100 rounded-xl p-1">
                          {(["WEEKLY", "DAILY"] as const).map((f) => (
                            <button
                              key={f}
                              type="button"
                              onClick={() => {
                                setFreq(f);
                                if (f === "DAILY") setSelectedDays([]);
                              }}
                              className={`flex-1 py-1.5 text-sm font-medium rounded-xl transition-colors ${
                                freq === f
                                  ? "bg-white text-gray-900 shadow-sm"
                                  : "text-gray-500 hover:text-gray-700"
                              }`}
                            >
                              {f === "WEEKLY" ? "Weekly" : "Daily"}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Days of week (weekly only) */}
                      {freq === "WEEKLY" && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            On these days
                          </label>
                          <div className="flex gap-1.5 flex-wrap">
                            {DAYS.map(({ label, value }) => (
                              <button
                                key={value}
                                type="button"
                                onClick={() => toggleDay(value)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                                  selectedDays.includes(value)
                                    ? "bg-orange-500 text-white border-orange-500"
                                    : "bg-white text-gray-600 border-gray-300 hover:border-orange-400"
                                }`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Until */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Repeat until
                        </label>
                        <DateTimeInput value={until} onChange={setUntil} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {serverError && <p className="text-red-500 text-sm">{serverError}</p>}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {submitting && (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  {submitting ? "Saving..." : `Save ${isShift ? "Shift" : "Event"}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default AddEventModal;
