interface Conversion {
  id: string;
  changedAt: Date | string;
  student: {
    name: string;
    surname: string;
    grade: { level: number } | null;
  };
}

const RecentConversions = ({ conversions }: { conversions: Conversion[] }) => {
  if (conversions.length === 0) {
    return (
      <div className="text-sm text-gray-400 py-4 text-center">
        No trial conversions recorded yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
            <th className="pb-2 font-medium">Student</th>
            <th className="pb-2 font-medium">Grade</th>
            <th className="pb-2 font-medium">Converted On</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {conversions.map((c) => (
            <tr key={c.id} className="hover:bg-gray-50">
              <td className="py-2 font-medium">
                {c.student.name} {c.student.surname}
              </td>
              <td className="py-2 text-gray-500">
                {c.student.grade ? `Grade ${c.student.grade.level}` : "—"}
              </td>
              <td className="py-2 text-gray-500">
                {new Intl.DateTimeFormat("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                }).format(new Date(c.changedAt))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RecentConversions;
