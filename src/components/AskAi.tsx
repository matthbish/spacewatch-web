import type { Launch } from '../domain';
import { Icon } from '../icons';

const SITES: [name: string, url: string][] = [
  ['ChatGPT', 'https://chatgpt.com/?q='],
  ['Claude', 'https://claude.ai/new?q='],
  ['Perplexity', 'https://www.perplexity.ai/search?q='],
];

export function launchPrompt(l: Launch): string {
  const facts = [
    ['Mission', l.missionName],
    ['Rocket', l.rocketName],
    ['Provider', l.providerName],
    ['Launch site', [l.padName, l.locationName].filter(Boolean).join(', ')],
    ['Launch time (UTC)', `${l.netIsPrecise ? '' : 'approximately '}${new Date(l.net).toISOString()}`],
    ['Status', l.status],
    ['Mission type', l.missionType],
    ['Description', l.missionDescription],
  ].filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`);
  return `I'm looking at this rocket launch:\n${facts.join('\n')}\n\nGive me a short overview plus one random interesting fact about it, then I'll ask follow-up questions.`;
}

/**
 * Third-party chats can't be embedded (they forbid framing), so these open the chat prefilled.
 * No key or backend on our side, and users need at most a free account.
 */
export function AskAi({ launch }: { launch: Launch }) {
  const q = encodeURIComponent(launchPrompt(launch));
  return (
    <section class="detail__ask">
      <h2>Ask an AI about this launch</h2>
      <div class="detail__ask-links">
        {SITES.map(([name, url]) => (
          <a key={name} class="text-button" href={url + q} target="_blank" rel="noopener noreferrer">
            <Icon name="openInNew" />{name}
          </a>
        ))}
      </div>
    </section>
  );
}
