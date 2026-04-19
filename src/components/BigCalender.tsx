"use client";

import { Calendar, momentLocalizer, View, Views } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import moment from "moment";
import "moment/locale/en-gb";
moment.locale("en-gb");
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

const localizer = momentLocalizer(moment);
const DnDCalendar = withDragAndDrop(Calendar);

// Predefined color mapping for common subjects
const subjectColorMap: Record<string, string> = {
  'Maths': '#EDBDF6',
  'Maths Preim': '#EDBDF6',
  'Maths Ext 1': '#EDBDF6',
  'Maths Ext 2': '#CBCBCB',
  'Maths Adv': '#FFC7E7',
  'English Adv': '#ED3E61',
  'English Ext 1': '#ED3E61',
  'English Ext 2': '#ED3E61',
  'Biology': '#D3FDCA',
  'Chemistry': '#CAFDFB',
  'Physics': '#FFFEC0',
  'Economics': '#FFCCE9',
  'Event': '#FC711866',
};

const generateColor = (subject: string, type: 'lesson' | 'event' | 'exam' | 'assignment' = 'lesson') => {
  if (subjectColorMap[subject]) {
    return subjectColorMap[subject];
  }

  const lessonColors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899',
    '#06B6D4', '#84CC16', '#F97316', '#6366F1', '#14B8A6', '#A855F7'
  ];
  const eventColors = [
    '#6B7280', '#9CA3AF', '#6366F1', '#8B5CF6', '#EC4899', '#EF4444',
    '#F59E0B', '#10B981', '#06B6D4', '#84CC16', '#F97316', '#14B8A6'
  ];
  // CHANGE EXAM COLORS HERE
  const examColors = [
    '#E3735E', '#E3735E', '#E3735E', '#E3735E', '#E3735E', '#E3735E'
  ];
  // CHANGE ASSIGNMENT COLORS HERE
  const assignmentColors = [
    '#FAC898', '#FAC898', '#FAC898', '#FAC898', '#FAC898', '#FAC898'
  ];

  const colors = type === 'lesson' ? lessonColors
    : type === 'event' ? eventColors
    : type === 'exam' ? examColors
    : assignmentColors;

  let hash = 0;
  for (let i = 0; i < subject.length; i++) {
    const char = subject.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  return colors[Math.abs(hash) % colors.length];
};

interface CalendarEvent {
  title: string;
  start: Date | string;
  end: Date | string;
  subject?: string;
  teacher?: string;
  classroom?: string;
  description?: string;
  lessonId?: number;
  recurringLessonId?: number;
  eventId?: number;
  isRecurring?: boolean;
  isMakeup?: boolean;
  type: 'lesson' | 'event' | 'exam' | 'assignment';
  subjectColor?: string;
}

type ProcessedEvent = CalendarEvent & { start: Date; end: Date };

interface PendingReschedule {
  event: ProcessedEvent;
  newStart: Date;
  newEnd: Date;
}

function toDatetimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const BigCalendar = ({
  initialLessons = [],
  initialEvents = [],
  showNotifications = false,
  canDragDrop = false,
  onEventClick,
}: {
  initialLessons?: CalendarEvent[];
  initialEvents?: CalendarEvent[];
  showNotifications?: boolean;
  canDragDrop?: boolean;
  onEventClick?: (event: ProcessedEvent) => void;
}) => {
  const [events, setEvents] = useState<ProcessedEvent[]>([]);

  useEffect(() => {
    const allEvents = [...initialLessons, ...initialEvents];
    setEvents(allEvents.map(event => ({
      ...event,
      start: new Date(event.start),
      end: new Date(event.end),
    })));
  }, [initialLessons, initialEvents]);

  const [view, setView] = useState<View>(Views.WEEK);
  const [date, setDate] = useState(new Date());

  const [selectedEvent, setSelectedEvent] = useState<ProcessedEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNotifying, setIsNotifying] = useState(false);

  const [pendingReschedule, setPendingReschedule] = useState<PendingReschedule | null>(null);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleEmailNotif, setRescheduleEmailNotif] = useState(false);
  const [singleRescheduledEvent, setSingleRescheduledEvent] = useState<{ event: ProcessedEvent; newStart: Date; newEnd: Date } | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteMakeupOpen, setDeleteMakeupOpen] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'error') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ text, type });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const titleComparison = a.title.localeCompare(b.title);
      if (titleComparison !== 0) return titleComparison;
      return a.start.getTime() - b.start.getTime();
    });
  }, [events]);

  const handleView = (newView: View) => setView(newView);
  const handleNavigate = (newDate: Date) => setDate(newDate);

  const handleEventClick = (event: object) => {
    const e = event as ProcessedEvent;
    if (onEventClick && e.type === 'event') {
      onEventClick(e);
      return;
    }
    setSelectedEvent(e);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  };

  const applyReschedule = useCallback(async (
    event: ProcessedEvent,
    newStart: Date,
    newEnd: Date,
    scope: 'instance' | 'series',
    sendEmail: boolean = false
  ) => {
    setIsRescheduling(true);

    // Optimistic update
    setEvents(prev => prev.map(e => {
      const isTarget = event.lessonId
        ? e.lessonId === event.lessonId
        : e.recurringLessonId === event.recurringLessonId && e.start.getTime() === event.start.getTime();
      return isTarget ? { ...e, start: newStart, end: newEnd } : e;
    }));

    try {
      const res = await fetch('/api/lessons/reschedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId: event.lessonId,
          recurringLessonId: event.recurringLessonId,
          startTime: toDatetimeLocal(newStart),
          endTime: toDatetimeLocal(newEnd),
          scope,
          originalDate: toDatetimeLocal(event.start),
        }),
      });

      if (!res.ok) {
        // Revert on failure
        setEvents(prev => prev.map(e => {
          const isTarget = event.lessonId
            ? e.lessonId === event.lessonId
            : e.recurringLessonId === event.recurringLessonId && e.start.getTime() === newStart.getTime();
          return isTarget ? { ...e, start: event.start, end: event.end } : e;
        }));
        showToast('Failed to reschedule lesson. Please try again.', 'error');
        return;
      }

      if (sendEmail) {
        await fetch('/api/lessons/email-notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'reschedule',
            lessonId: event.lessonId,
            recurringLessonId: event.recurringLessonId,
            lessonTitle: event.title,
            newStart: newStart.toISOString(),
            newEnd: newEnd.toISOString(),
            scope,
          }),
        });
      } else if (!event.recurringLessonId) {
        // For single lessons with no modal, offer the email action after save
        setSingleRescheduledEvent({ event, newStart, newEnd });
      }
    } catch {
      setEvents(prev => prev.map(e => {
        const isTarget = event.lessonId
          ? e.lessonId === event.lessonId
          : e.recurringLessonId === event.recurringLessonId && e.start.getTime() === newStart.getTime();
        return isTarget ? { ...e, start: event.start, end: event.end } : e;
      }));
      showToast('Failed to reschedule lesson. Please try again.', 'error');
    } finally {
      setIsRescheduling(false);
      setPendingReschedule(null);
      setRescheduleEmailNotif(false);
    }
  }, []);

  const handleEventDrop = useCallback(({ event, start, end }: { event: object; start: Date | string; end: Date | string }) => {
    const e = event as ProcessedEvent;
    if (e.type !== 'lesson') return;

    const newStart = new Date(start);
    const newEnd = new Date(end);

    if (e.isRecurring && e.recurringLessonId) {
      setPendingReschedule({ event: e, newStart, newEnd });
    } else if (e.lessonId) {
      applyReschedule(e, newStart, newEnd, 'instance');
    }
  }, [applyReschedule]);

  const handleEventResize = useCallback(({ event, start, end }: { event: object; start: Date | string; end: Date | string }) => {
    const e = event as ProcessedEvent;
    if (e.type !== 'lesson') return;

    const newStart = new Date(start);
    const newEnd = new Date(end);

    if (e.isRecurring && e.recurringLessonId) {
      setPendingReschedule({ event: e, newStart, newEnd });
    } else if (e.lessonId) {
      applyReschedule(e, newStart, newEnd, 'instance');
    }
  }, [applyReschedule]);

  const handleNotifyTeacher = async () => {
    if (!selectedEvent || (!selectedEvent.lessonId && !selectedEvent.recurringLessonId)) return;

    setIsNotifying(true);
    try {
      const response = await fetch('/api/attendance/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId: selectedEvent.lessonId,
          recurringLessonId: selectedEvent.recurringLessonId,
          title: `Late: ${selectedEvent.title}`,
          message: `Student will be late for ${selectedEvent.title} lesson`,
          type: 'late_notification',
        }),
      });

      if (response.ok) {
        showToast('Teacher has been notified about your late arrival.', 'success');
        closeModal();
      } else {
        showToast('Failed to send notification. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      showToast('Failed to send notification. Please try again.', 'error');
    } finally {
      setIsNotifying(false);
    }
  };

  const eventStyleGetter = (event: object) => {
    const e = event as CalendarEvent;
    const backgroundColor = e.subject
      ? generateColor(e.subject, e.type)
      : e.type === 'event'
        ? '#6B7280'
        : e.type === 'exam'
          ? '#E3735E'
          : e.type === 'assignment'
            ? '#059669'
            : '#3B82F6';

    const isEvent = e.type === 'event';

    return {
      style: {
        backgroundColor,
        borderRadius: '6px',
        opacity: isEvent ? 0.85 : 0.9,
        color: 'white',
        border: isEvent ? '2px solid rgba(255,255,255,0.3)' : 'none',
        display: 'block',
        fontSize: view === 'month' ? '11px' : '12px',
        padding: view === 'month' ? '1px 3px' : '4px 6px',
        fontWeight: isEvent ? '600' : '500',
        textShadow: '0 1px 2px rgba(0,0,0,0.3)',
        boxShadow: view !== 'month' ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
      }
    };
  };

  const dayViewProps = {
    dayLayoutAlgorithm: 'no-overlap' as const,
    step: 30,
    timeslots: 2,
  };

  const draggableAccessor = useCallback((event: object) => {
    const e = event as CalendarEvent;
    return canDragDrop && e.type === 'lesson';
  }, [canDragDrop]);

  const resizableAccessor = useCallback((event: object) => {
    const e = event as CalendarEvent;
    return canDragDrop && e.type === 'lesson';
  }, [canDragDrop]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  const newDate = new Date(date);
                  if (view === 'month') newDate.setMonth(newDate.getMonth() - 1);
                  else if (view === 'week') newDate.setDate(newDate.getDate() - 7);
                  else newDate.setDate(newDate.getDate() - 1);
                  handleNavigate(newDate);
                }}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors flex items-center space-x-1"
              >
                <span>←</span>
                <span className="text-sm font-medium">
                  {view === 'month' ? 'Previous Month' : view === 'week' ? 'Previous Week' : 'Previous Day'}
                </span>
              </button>

              <button
                onClick={() => handleNavigate(new Date())}
                className="px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition-colors text-sm font-medium"
              >
                Today
              </button>

              <button
                onClick={() => {
                  const newDate = new Date(date);
                  if (view === 'month') newDate.setMonth(newDate.getMonth() + 1);
                  else if (view === 'week') newDate.setDate(newDate.getDate() + 7);
                  else newDate.setDate(newDate.getDate() + 1);
                  handleNavigate(newDate);
                }}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors flex items-center space-x-1"
              >
                <span className="text-sm font-medium">
                  {view === 'month' ? 'Next Month' : view === 'week' ? 'Next Week' : 'Next Day'}
                </span>
                <span>→</span>
              </button>
            </div>

            <div className="flex-1 text-center">
              <h2 className="text-xl font-semibold text-gray-800">
                {view === 'month'
                  ? date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
                  : view === 'week'
                    ? (() => {
                      const weekStart = moment(date).startOf('week').toDate();
                      const weekEnd = moment(date).endOf('week').toDate();
                      return `${weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${weekEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
                    })()
                    : date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                }
              </h2>
            </div>

            <div className="flex bg-gray-100 rounded-xl p-1">
              {(['month', 'week', 'day'] as View[]).map((viewType) => (
                <button
                  key={viewType}
                  onClick={() => handleView(viewType)}
                  className={`px-3 py-1 text-sm font-medium rounded-xl transition-colors ${view === viewType
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  {viewType.charAt(0).toUpperCase() + viewType.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Calendar */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <DnDCalendar
            localizer={localizer}
            events={sortedEvents}
            startAccessor={(event) => (event as ProcessedEvent).start}
            endAccessor={(event) => (event as ProcessedEvent).end}
            views={["month", "week", "day"]}
            view={view}
            date={date}
            style={{ height: "100%", width: "100%", minHeight: "400px" }}
            onView={handleView}
            onNavigate={handleNavigate}
            onSelectEvent={handleEventClick}
            eventPropGetter={eventStyleGetter}
            min={view !== "month" ? new Date(1970, 0, 1, 9, 0, 0) : undefined}
            max={view !== "month" ? new Date(1970, 0, 1, 23, 0, 0) : undefined}
            popup={view === "month"}
            popupOffset={30}
            showMultiDayTimes={true}
            culture="en-GB"
            draggableAccessor={draggableAccessor}
            resizableAccessor={resizableAccessor}
            onEventDrop={handleEventDrop}
            onEventResize={handleEventResize}
            {...(view === 'day' ? dayViewProps : {})}
            components={{
              event: ({ event }) => {
                const e = event as CalendarEvent;
                return (
                  <div
                    className={`text-black text-xs font-medium overflow-hidden ${view === 'month' ? 'leading-tight' : 'leading-normal'}`}
                    style={{
                      textOverflow: 'ellipsis',
                      whiteSpace: view === 'month' ? 'nowrap' : 'normal',
                      height: view === 'month' ? '100%' : 'auto',
                      display: 'flex',
                      alignItems: view === 'month' ? 'center' : 'flex-start',
                      padding: view === 'month' ? '1px 3px' : '2px 4px',
                    }}
                  >
                    {e.type === 'event' && <span className="mr-1 opacity-90"></span>}
                    <span className="truncate">{e.title}</span>
                  </div>
                );
              },
            }}
          />
        </div>

        {/* Event details modal */}
        {isModalOpen && selectedEvent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-96 max-w-lg mx-4 shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">
                  {selectedEvent.type === 'event' ? 'Event' : 'Lesson'} Details
                </h2>
                <button onClick={closeModal} className="text-gray-500 hover:text-gray-700 text-2xl font-bold">×</button>
              </div>

              <div className="space-y-3">
                <div>
                  <span className="font-semibold text-gray-700">Title:</span>
                  <p className="text-gray-600">{selectedEvent.title}</p>
                </div>

                {selectedEvent.type === 'event' && (
                  <div className="bg-blue-50 p-3 rounded-xl">
                    <span className="text-blue-800 font-medium">📅 Event</span>
                  </div>
                )}

                <div>
                  <span className="font-semibold text-gray-700">Start Time:</span>
                  <p className="text-gray-600">
                    {new Date(selectedEvent.start).toLocaleString("en-GB", {
                      weekday: "long", year: "numeric", month: "long", day: "numeric",
                      hour: "2-digit", minute: "2-digit",
                      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    })}
                  </p>
                </div>

                <div>
                  <span className="font-semibold text-gray-700">End Time:</span>
                  <p className="text-gray-600">
                    {new Date(selectedEvent.end).toLocaleString("en-GB", {
                      weekday: "long", year: "numeric", month: "long", day: "numeric",
                      hour: "2-digit", minute: "2-digit",
                      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    })}
                  </p>
                </div>

                <div>
                  <span className="font-semibold text-gray-700">Duration:</span>
                  <p className="text-gray-600">
                    {Math.round((new Date(selectedEvent.end).getTime() - new Date(selectedEvent.start).getTime()) / (1000 * 60))} minutes
                  </p>
                </div>

                {selectedEvent.subject && selectedEvent.type === 'lesson' && (
                  <div>
                    <span className="font-semibold text-gray-700">Subject:</span>
                    <p className="text-gray-600">{selectedEvent.subject}</p>
                  </div>
                )}

                {selectedEvent.teacher && selectedEvent.type !== 'event' && (
                  <div>
                    <span className="font-semibold text-gray-700">Teacher:</span>
                    <p className="text-gray-600">{selectedEvent.teacher}</p>
                  </div>
                )}

                {selectedEvent.classroom && selectedEvent.type !== 'event' && (
                  <div>
                    <span className="font-semibold text-gray-700">Classroom:</span>
                    <p className="text-gray-600">{selectedEvent.classroom}</p>
                  </div>
                )}

                {selectedEvent.description && (
                  <div>
                    <span className="font-semibold text-gray-700">Description:</span>
                    <p className="text-gray-600">{selectedEvent.description}</p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-between items-center gap-2">
                {showNotifications && selectedEvent.type === 'lesson' && (
                  <button
                    onClick={handleNotifyTeacher}
                    disabled={isNotifying || !selectedEvent?.lessonId}
                    className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isNotifying ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Notifying...
                      </>
                    ) : (
                      <>🔔 Notify Teacher (Late)</>
                    )}
                  </button>
                )}

                <div className="flex gap-2 ml-auto">
                  {canDragDrop && selectedEvent.isMakeup && selectedEvent.lessonId && (
                    <button
                      onClick={() => setDeleteMakeupOpen(true)}
                      disabled={isDeleting}
                      className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isDeleting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Deleting…
                        </>
                      ) : (
                        'Delete Makeup'
                      )}
                    </button>
                  )}
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recurring lesson reschedule scope modal */}
        {pendingReschedule && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-96 max-w-lg mx-4 shadow-xl">
              <h2 className="text-xl font-bold text-gray-800 mb-2">Reschedule Recurring Lesson</h2>
              <p className="text-gray-600 mb-1">
                <span className="font-medium">{pendingReschedule.event.title}</span>
              </p>
              <p className="text-gray-500 text-sm mb-6">
                This is a recurring lesson. How would you like to apply this change?
              </p>

              <div className="space-y-3 mb-4">
                <button
                  onClick={() => applyReschedule(
                    pendingReschedule.event,
                    pendingReschedule.newStart,
                    pendingReschedule.newEnd,
                    'instance',
                    rescheduleEmailNotif
                  )}
                  disabled={isRescheduling}
                  className="w-full text-left px-4 py-3 border-2 border-gray-200 hover:border-orange-400 hover:bg-orange-50 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <p className="font-semibold text-gray-800">This occurrence only</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Only move this single lesson to{' '}
                    {pendingReschedule.newStart.toLocaleString('en-GB', {
                      weekday: 'short', day: 'numeric', month: 'short',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </button>

                <button
                  onClick={() => applyReschedule(
                    pendingReschedule.event,
                    pendingReschedule.newStart,
                    pendingReschedule.newEnd,
                    'series',
                    rescheduleEmailNotif
                  )}
                  disabled={isRescheduling}
                  className="w-full text-left px-4 py-3 border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <p className="font-semibold text-gray-800">All occurrences in this series</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Update the time for every lesson in this recurring series to{' '}
                    {pendingReschedule.newStart.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    {' – '}
                    {pendingReschedule.newEnd.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </button>
              </div>

              {/* Email notification toggle */}
              <label className="flex items-center gap-2 mb-6 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rescheduleEmailNotif}
                  onChange={e => setRescheduleEmailNotif(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">Notify students &amp; parents by email</span>
              </label>

              {isRescheduling && (
                <div className="flex items-center justify-center gap-2 text-gray-500 mb-4">
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm">Saving...</span>
                </div>
              )}

              <button
                onClick={() => setPendingReschedule(null)}
                disabled={isRescheduling}
                className="w-full px-4 py-2 text-gray-600 hover:text-gray-800 text-sm transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      {/* Delete makeup lesson confirmation */}
      <ConfirmDialog
        isOpen={deleteMakeupOpen}
        title="Delete Makeup Lesson"
        message="Are you sure you want to delete this makeup lesson? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onCancel={() => setDeleteMakeupOpen(false)}
        onConfirm={async () => {
          if (!selectedEvent?.lessonId) return;
          setDeleteMakeupOpen(false);
          setIsDeleting(true);
          try {
            const res = await fetch(`/api/lessons/makeup/${selectedEvent.lessonId}`, { method: 'DELETE' });
            if (res.ok) {
              setEvents(prev => prev.filter(e => e.lessonId !== selectedEvent.lessonId));
              closeModal();
            } else {
              showToast('Failed to delete makeup lesson. Please try again.', 'error');
            }
          } finally {
            setIsDeleting(false);
          }
        }}
      />

      {/* Toast notification */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[9998] px-5 py-3 rounded-xl shadow-xl text-sm font-medium text-white transition-all ${
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {toast.text}
        </div>
      )}

      {/* Post-reschedule email banner for single lessons */}
      {singleRescheduledEvent && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-800 text-white rounded-xl shadow-xl px-5 py-3 flex items-center gap-4 text-sm">
          <span>Lesson rescheduled.</span>
          <button
            disabled={isSendingEmail}
            onClick={async () => {
              setIsSendingEmail(true);
              await fetch('/api/lessons/email-notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'reschedule',
                  lessonId: singleRescheduledEvent.event.lessonId,
                  lessonTitle: singleRescheduledEvent.event.title,
                  newStart: singleRescheduledEvent.newStart.toISOString(),
                  newEnd: singleRescheduledEvent.newEnd.toISOString(),
                  scope: 'instance',
                }),
              });
              setIsSendingEmail(false);
              setSingleRescheduledEvent(null);
            }}
            className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            {isSendingEmail ? 'Sending…' : 'Email students & parents'}
          </button>
          <button
            onClick={() => setSingleRescheduledEvent(null)}
            className="text-gray-400 hover:text-white text-lg leading-none"
          >
            ×
          </button>
        </div>
      )}
      </div>
    </DndProvider>
  );
};

export default BigCalendar;
