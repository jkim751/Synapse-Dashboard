"use client";

import { Calendar, momentLocalizer, View, Views } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import moment from "moment";
import "moment/locale/en-gb";
moment.locale("en-gb");
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import { useState, useMemo } from "react";
import { updateLessonTimes } from "@/lib/actions";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

const localizer = momentLocalizer(moment);
const DragAndDropCalendar = withDragAndDrop(Calendar);

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

// Generate consistent colors for subjects and events
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
  start: Date;
  end: Date;
  subject?: string;
  teacher?: string;
  classroom?: string;
  description?: string;
  lessonId?: number;
  eventId?: number;
  type: 'lesson' | 'event' | 'exam' | 'assignment';
  subjectColor?: string;
}

const BigCalendar = ({ 
  initialLessons = [], 
  initialEvents = [], 
  showNotifications = false 
}: { 
  initialLessons?: CalendarEvent[];
  initialEvents?: CalendarEvent[];
  showNotifications?: boolean; 
}) => {
  const router = useRouter();
  const [lessons] = useState<CalendarEvent[]>(initialLessons);
  const [events] = useState<CalendarEvent[]>(initialEvents);

  const [view, setView] = useState<View>(Views.WEEK);
  const [date, setDate] = useState(new Date());

  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNotifying, setIsNotifying] = useState(false);

  const sortedEvents = useMemo(() => {
    const allEvents = [...lessons, ...events];
    return allEvents.sort((a, b) => {
      // Primary sort: alphabetical by title
      const titleComparison = a.title.localeCompare(b.title);
      if (titleComparison !== 0) {
        return titleComparison;
      }
      // Secondary sort: by start time if titles are the same
      return a.start.getTime() - b.start.getTime();
    });
  }, [lessons, events]);

  const handleView = (newView: View) => setView(newView);
  const handleNavigate = (newDate: Date) => setDate(newDate);

  const handleEventClick = (event: object, e: React.SyntheticEvent) => {
    setSelectedEvent(event as CalendarEvent);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  };

  const handleNotifyTeacher = async () => {
    if (!selectedEvent || !selectedEvent.lessonId) return;

    setIsNotifying(true);
    try {
      const response = await fetch('/api/attendance/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId: selectedEvent.lessonId,
          title: `Late: ${selectedEvent.title}`,
          message: `Student will be late for ${selectedEvent.title} lesson`,
          type: 'late_notification',
        }),
      });

      if (response.ok) {
        alert('Teacher has been notified about your late arrival.');
        closeModal();
      } else {
        alert('Failed to send notification. Please try again.');
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      alert('Failed to send notification. Please try again.');
    } finally {
      setIsNotifying(false);
    }
  };

  const handleEventDrop = async ({ event, start, end }: any) => {
    try {
      console.log("Event dropped:", { event, start, end });
      
      // Only allow dragging lessons, not events/exams/assignments
      if (event.type !== 'lesson') {
        toast.warning("Only lessons can be moved on the calendar");
        return;
      }

      // For recurring lessons, ask if they want to update series or just this instance
      if (event.isRecurring && event.recurringLessonId) {
        const updateSeries = window.confirm(
          "This is a recurring lesson. Do you want to update the entire series?\n\n" +
          "Click OK to update all occurrences\n" +
          "Click Cancel to update only this instance"
        );
        
        const result = await updateLessonTimes({
          id: event.recurringLessonId,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          variant: "recurring",
          updateScope: updateSeries ? "series" : "instance",
          originalDate: event.start.toISOString(),
        });
        
        if (result.success) {
          toast.success(result.message);
          router.refresh();
        } else {
          toast.error(result.message);
        }
      } else if (event.lessonId) {
        // Single lesson
        const result = await updateLessonTimes({
          id: event.lessonId,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          variant: "single",
        });
        
        if (result.success) {
          toast.success(result.message);
          router.refresh();
        } else {
          toast.error(result.message);
        }
      }
    } catch (error) {
      console.error("Error updating lesson time:", error);
      toast.error("Failed to update lesson time");
    }
  };

  const handleEventResize = async ({ event, start, end }: any) => {
    // Similar logic to handleEventDrop
    await handleEventDrop({ event, start, end });
  };

  const eventStyleGetter = (event: object) => {
    const calendarEvent = event as CalendarEvent;
    const backgroundColor = calendarEvent.subject
      ? generateColor(calendarEvent.subject, calendarEvent.type)
      : calendarEvent.type === 'event'
        ? '#6B7280'  // CHANGE DEFAULT EVENT COLOR HERE
        : calendarEvent.type === 'exam'
          ? '##E3735E'  // CHANGE DEFAULT EXAM COLOR HERE
          : calendarEvent.type === 'assignment'
            ? '#059669'  // CHANGE DEFAULT ASSIGNMENT COLOR HERE
            : '#3B82F6';  // CHANGE DEFAULT LESSON COLOR HERE

    const isEvent = calendarEvent.type === 'event';

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

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                const newDate = new Date(date);
                if (view === 'month') {
                  newDate.setMonth(newDate.getMonth() - 1);
                } else if (view === 'week') {
                  newDate.setDate(newDate.getDate() - 7);
                } else {
                  newDate.setDate(newDate.getDate() - 1);
                }
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
                if (view === 'month') {
                  newDate.setMonth(newDate.getMonth() + 1);
                } else if (view === 'week') {
                  newDate.setDate(newDate.getDate() + 7);
                } else {
                  newDate.setDate(newDate.getDate() + 1);
                }
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
                  : date.toLocaleDateString('en-GB', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })
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

      <div className="flex-1 min-h-0 overflow-hidden">
        <DragAndDropCalendar
          localizer={localizer}
          events={sortedEvents}
          startAccessor={(event: any) => event.start}
          endAccessor={(event: any) => event.end}
          views={["month", "week", "day"]}
          view={view}
          date={date}
          style={{
            height: "100%",
            width: "100%",
            minHeight: "400px"
          }}
          onView={handleView}
          onNavigate={handleNavigate}
          onSelectEvent={handleEventClick}
          eventPropGetter={eventStyleGetter}
          min={view !== "month" ? new Date(2025, 0, 1, 9, 0, 0) : undefined}
          max={view !== "month" ? new Date(2025, 0, 1, 23, 0, 0) : undefined}
          popup={view === "month"}
          popupOffset={30}
          showMultiDayTimes={true}
          culture="en-GB"
          {...(view === 'day' ? dayViewProps : {})}
          // Drag and drop configuration
          draggableAccessor={(event: object) => (event as CalendarEvent).type === 'lesson'}
          resizable
          onEventDrop={handleEventDrop}
          onEventResize={handleEventResize}
          components={{
            event: ({ event }) => {
              const calendarEvent = event as CalendarEvent;
              return (
                <div
                  className={`text-black text-xs font-medium overflow-hidden ${view === 'month' ? 'leading-tight' : 'leading-normal'
                    }`}
                  style={{
                    textOverflow: 'ellipsis',
                    whiteSpace: view === 'month' ? 'nowrap' : 'normal',
                    height: view === 'month' ? '100%' : 'auto',
                    display: 'flex',
                    alignItems: view === 'month' ? 'center' : 'flex-start',
                    padding: view === 'month' ? '1px 3px' : '2px 4px',
                    cursor: calendarEvent.type === 'lesson' ? 'move' : 'default',
                  }}
                >
                  {calendarEvent.type === 'event' && (
                    <span className="mr-1 opacity-90"></span>
                  )}
                  <span className="truncate">{calendarEvent.title}</span>
                </div>
              );
            },
          }}
        />
      </div>

      {isModalOpen && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 max-w-lg mx-4 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">
                {selectedEvent.type === 'event' ? 'Event' : 'Lesson'} Details
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                
              </button>
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
                  {selectedEvent.start.toLocaleString("en-GB", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>

              <div>
                <span className="font-semibold text-gray-700">End Time:</span>
                <p className="text-gray-600">
                  {selectedEvent.end.toLocaleString("en-GB", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>

              <div>
                <span className="font-semibold text-gray-700">Duration:</span>
                <p className="text-gray-600">
                  {Math.round((selectedEvent.end.getTime() - selectedEvent.start.getTime()) / (1000 * 60))} minutes
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

            <div className="mt-6 flex justify-between">
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
                    <>
                      🔔 Notify Teacher (Late)
                    </>
                  )}
                </button>
              )}
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors ml-auto"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BigCalendar;