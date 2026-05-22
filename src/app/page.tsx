import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-6">
        <h1 className="text-3xl font-bold">Whetstone</h1>
        <p className="text-gray-600">
          Daily accountability check-ins, shared with the people who keep you sharp.
        </p>
        <div className="flex gap-3 justify-center">
          <Button asChild>
            <Link href="/signup">Get started</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/signin">Sign in</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
