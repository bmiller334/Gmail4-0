import { MindPalace } from "@/components/mind-palace";
import { ReadLaterWidget } from "@/components/read-later-widget";

export const dynamic = 'force-dynamic';

export default function AssistantPage() {
  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="w-full">
          <MindPalace />
      </div>
      <div className="max-w-2xl">
          <ReadLaterWidget />
      </div>
    </div>
  );
}
