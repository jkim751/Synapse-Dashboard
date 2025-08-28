interface DocumentListProps {
  documents: string[];
  type: "exam" | "assignment" | "result";
  maxVisible?: number;
}

const DocumentList = ({ documents, type, maxVisible = 3 }: DocumentListProps) => {
  if (!documents || documents.length === 0) {
    return <span className="text-black-400 text-xs">No documents</span>;
  }

  const getDocumentName = (url: string, index: number) => {
    // Try to extract filename from URL
    const filename = url.split('/').pop()?.split('?')[0];
    if (filename && filename !== 'undefined') {
      return filename.length > 15 ? filename.substring(0, 15) + '...' : filename;
    }
    return `Doc ${index + 1}`;
  };

  const getFileNameFromUrl = (input: string) => {
    try {
      // Absolute URL
      const u = new URL(input);
      return decodeURIComponent(u.pathname.split("/").pop() || input);
    } catch {
      // Relative path
      const noQuery = input.split(/[?#]/)[0];
      const base = noQuery.split("/").pop() || noQuery;
      try { return decodeURIComponent(base); } catch { return base; }
    }
  };
  const humanizeFileName = (filename: string) => {
    // 1) remove leading long digit blocks (6+ digits) + '-'/'_'
    let name = filename.replace(/^\d{6,}[-_]/, "");
    // 2) remove UUID v4 + '-'/'_'
    name = name.replace(
      /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}[-_]/i,
      ""
    );
    // 3) remove hex hash (8–32 chars) + '-'/'_'
    name = name.replace(/^[a-f0-9]{8,32}[-_]/i, "");

    // If you prefer to hide the extension in the UI, uncomment:
    // const dot = name.lastIndexOf(".");
    // if (dot > 0) name = name.slice(0, dot);

    return name;
  };


  const colorClasses = {
    exam: "bg-lightblue-100 text-lightblue-800 hover:bg-lightblue-200",
    assignment: "bg-lightgreen-100 text-lightgreen-800 hover:bg-lightgreen-200"
  };

  const visibleDocs = documents.slice(0, maxVisible);
  const remainingCount = documents.length - maxVisible;
  const normalizeUrl = (u: string) => (u.startsWith("http") ? u : `/${u.replace(/^\/+/, "")}`);

  return (
    <div className="flex flex-wrap gap-1">
      {visibleDocs.map((doc, index) => {
        const filename = getFileNameFromUrl(doc);
        const label = humanizeFileName(filename);
        return (
          <a
            key={index}
            href={normalizeUrl(doc)}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="px-2 py-1 rounded-md bg-orange-100 text-orange-800 text-xs hover:bg-orange-200 truncate max-w-[12rem]"
            title={label}
          >
            {label}
          </a>
        );
      })}
      {remainingCount > 0 && (
        <span className="text-xs text-gray-500 px-2 py-1">
          +{remainingCount} more
        </span>
      )}
    </div>
  );
};

export default DocumentList;
