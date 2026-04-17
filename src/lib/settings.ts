export const ITEM_PER_PAGE = 10

type RouteAccessMap = {
  [key: string]: string[];
};

export const routeAccessMap: RouteAccessMap = {
  "/admin(.*)": ["admin", "director"],
  "/student(.*)": ["student"],
  "/teacher(.*)": ["teacher"],
  "/parent(.*)": ["parent"],
  "/list/teachers": ["admin", "director"],
  "/list/students": ["admin", "director", "teacher"],
  "/list/parents": ["admin", "director", "teacher"],
  "/list/subjects": ["admin", "director"],
  "/list/classes": ["admin", "director", "teacher"],
  "/list/assessments": ["teacher", "student", "parent"],
  "/list/results": ["teacher", "student", "parent"],
  "/list/attendance": ["admin", "director", "teacher"],
  "/list/events": ["admin", "director", "teacher", "student", "parent"],
  "/list/announcements": ["admin", "director", "teacher", "student", "parent"],
  "/list/invoices": ["parent"],
  "/list/xero": ["admin", "director"],
};