export const ITEM_PER_PAGE = 10

type RouteAccessMap = {
  [key: string]: string[];
};

export const routeAccessMap: RouteAccessMap = {
  "/admin(.*)": ["admin", "director", "teacher-admin"],
  "/student(.*)": ["student"],
  "/teacher(.*)": ["teacher"],
  "/parent(.*)": ["parent"],
  "/list/teachers": ["admin", "director", "teacher-admin"],
  "/list/students": ["admin", "director", "teacher", "teacher-admin"],
  "/list/parents": ["admin", "director", "teacher", "teacher-admin"],
  "/list/subjects": ["admin", "director", "teacher-admin"],
  "/list/classes": ["admin", "director", "teacher", "teacher-admin"],
  "/list/assessments": ["teacher", "teacher-admin", "student", "parent"],
  "/list/results": ["teacher", "teacher-admin", "student", "parent"],
  "/list/attendance": ["admin", "director", "teacher", "teacher-admin"],
  "/list/events": ["admin", "director", "teacher", "teacher-admin", "student", "parent"],
  "/list/announcements": ["admin", "director", "teacher", "teacher-admin", "student", "parent"],
  "/list/invoices": ["parent"],
  "/list/xero": ["admin", "director", "teacher-admin"],
  "/list/payroll": ["admin", "director", "teacher", "teacher-admin"],
  "/list/hours": ["director", "teacher", "teacher-admin"],
  "/list/stats": ["admin", "director", "teacher-admin"],
  "/list/notes": ["admin", "director", "teacher-admin"],
  "/list/admins": ["admin", "director", "teacher-admin"],
  "/list/lessons": ["admin", "director", "teacher", "teacher-admin"],
  "/list/expenses": ["admin", "director", "teacher-admin"],
  "/list/pay": ["director"],
  "/list/paysheet": ["admin", "director", "teacher-admin"],
  "/list/reports": ["director"],
  "/list/cashbook": ["admin", "director", "teacher-admin"],
};