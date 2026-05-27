type InventoryItem = {
  id: string;
  isbn: string;
  title?: string;
  stock: number;
  price?: string;
  updatedAt: string;
  publisher: { name: string };
};

export function InventoryTable({ items }: { items: InventoryItem[] }) {
  return (
    <div className="overflow-x-auto rounded border border-zinc-200 bg-white">
      <table className="w-full min-w-[760px] border-collapse">
        <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
          <tr>
            <th className="table-cell">ISBN</th>
            <th className="table-cell">Title</th>
            <th className="table-cell">Stock</th>
            <th className="table-cell">Publisher</th>
            <th className="table-cell">Price</th>
            <th className="table-cell">Updated</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-zinc-50">
              <td className="table-cell font-mono">{item.isbn}</td>
              <td className="table-cell">{item.title || "-"}</td>
              <td className="table-cell">{item.stock}</td>
              <td className="table-cell">{item.publisher.name}</td>
              <td className="table-cell">{item.price ?? "-"}</td>
              <td className="table-cell">{new Date(item.updatedAt).toLocaleString()}</td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td className="table-cell text-zinc-500" colSpan={6}>No records found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

