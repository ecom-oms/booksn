import { SearchPanel } from "../../components/SearchPanel";
import { Shell } from "../../components/Shell";

export default function BulkPage() {
  return (
    <Shell title="Bulk Query">
      <SearchPanel bulkMode />
    </Shell>
  );
}

