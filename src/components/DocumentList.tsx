interface DocumentListProps {
  documents: string[];
  type: "assessment" | "result";
  maxVisible?: number;
}

/**
 * Extracts a human-readable filename from a Vercel Blob URL.
 * Upload route stores files as: uploads/{folder}/{timestamp}-{sanitized-name}
 * so we strip the leading "{digits}-" prefix produced by the upload route.
 * Falls back gracefully for older URLs that may have different prefixes.
 */
function getLabelFromUrl(url: string): string {
  try {
    const raw = decodeURIComponent(new URL(url).pathname.split("/").pop() || url);
    // Strip timestamp prefix (e.g. "1714000000000-filename.pdf" → "filename.pdf")
    return raw.replace(/^\d+-/, "");
  } catch {
    const raw = url.split(/[?#]/)[0].split("/").pop() || url;
    try {
      return decodeURIComponent(raw).replace(/^\d+-/, "");
    } catch {
      return raw;
    }
  }
}

const DocumentList = ({ documents, maxVisible = 3 }: DocumentListProps) => {
  if (!documents || documents.length === 0) {
    return <span className="text-gray-400 text-xs">No documents</span>;
  }

  const visibleDocs = documents.slice(0, maxVisible);
  const remainingCount = documents.length - maxVisible;

  return (
    <div className="flex flex-wrap gap-1">
      {visibleDocs.map((doc, index) => {
        const label = getLabelFromUrl(doc);
        return (
          <a
            key={index}
            href={doc}
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
