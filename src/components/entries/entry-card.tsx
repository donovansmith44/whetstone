type Field = { key: string; label: string; type: string };

export function EntryCard({
  userName,
  fields,
  values,
  createdAt,
}: {
  userName: string;
  fields: Field[];
  values: Record<string, string>;
  createdAt: Date;
}) {
  return (
    <article className="border rounded p-4 space-y-3">
      <header className="flex justify-between items-baseline">
        <h3 className="font-medium">{userName}</h3>
        <time className="text-xs text-gray-500">{new Date(createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
      </header>
      <div className="space-y-2">
        {fields.map((f) => {
          const v = values[f.key];
          if (!v) return null;
          return (
            <div key={f.key}>
              <div className="text-xs uppercase tracking-wide text-gray-500">{f.label}</div>
              <div className="whitespace-pre-wrap">{v}</div>
            </div>
          );
        })}
      </div>
    </article>
  );
}
