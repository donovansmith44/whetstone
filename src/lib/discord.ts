export type DiscordMessage = {
  content: string;
};

export async function postToDiscord(webhookUrl: string, msg: DiscordMessage): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(msg),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Discord webhook failed: ${res.status} ${body}`);
  }
}
