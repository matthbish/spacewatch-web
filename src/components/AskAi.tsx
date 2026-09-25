import type { Launch } from '../domain';
import { Icon } from '../icons';

const SITES: [name: string, url: string][] = [
  ['ChatGPT', 'https://chatgpt.com/?q='],
  ['Claude', 'https://claude.ai/new?q='],
  ['Perplexity', 'https://www.perplexity.ai/search?q='],
];

export function launchPrompt(l: Launch): string {
  const time = new Date(l.net).toISOString().slice(0, 16).replace('T', ' ');
  const facts = [
    ['Mission', l.missionName],
    ['Rocket', l.rocketName],
    ['Provider', l.providerName],
    ['Launch time', `${l.netIsPrecise ? '' : 'approximately '}${time} UTC`],
    ['Launch site', [l.padName, l.locationName].filter(Boolean).join(', ')],
  ].filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`);
  return `I'm looking at this rocket launch:\n${facts.join('\n')}\n\n`
    +'First, a short bullet list of key facts a rocket/space enthusiast would want: rocket height and speed, payload mass and '
    + 'target orbit, whether anything will be recovered or landed, time to orbit, total mission duration, and '
    + "anything else notable. Then a short overview. I'll ask follow-up questions after.";
}

/**
 * Third-party chats can't be embedded (they forbid framing), so these open the chat prefilled.
 * No key or backend on our side, and users need at most a free account.
 */
export function AskAi({ launch }: { launch: Launch }) {
  const q = encodeURIComponent(launchPrompt(launch));
  return (
    <section class="detail__ask">
      <h2>Ask AI about this launch</h2>
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
