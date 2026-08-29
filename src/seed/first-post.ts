/**
 * The article the blog starts with.
 *
 * Seeded as a **draft**, never published. It exists so the section is not an
 * empty room on the first day and so every formatting feature — headings, bold,
 * lists, a quote, a link — is visible in the editor as a worked example rather
 * than described in documentation nobody opens. Read it, make it yours, publish
 * it. Or delete it; nothing depends on it.
 */

type Node = Record<string, unknown>

/** The fields Lexical expects on every node, so the editor can open this. */
const base = { version: 1, format: '', indent: 0, direction: 'ltr' as const }

const text = (value: string, format = 0): Node => ({
  type: 'text',
  text: value,
  format,
  style: '',
  mode: 'normal',
  detail: 0,
  version: 1,
})

const bold = (value: string) => text(value, 1)

const link = (value: string, url: string): Node => ({
  type: 'link',
  ...base,
  fields: { linkType: 'custom', url, newTab: false },
  children: [text(value)],
})

const p = (...children: Node[]): Node => ({ type: 'paragraph', ...base, textFormat: 0, children })

const h2 = (value: string): Node => ({ type: 'heading', ...base, tag: 'h2', children: [text(value)] })

const quote = (value: string): Node => ({ type: 'quote', ...base, children: [text(value)] })

const ul = (...items: string[]): Node => ({
  type: 'list',
  ...base,
  listType: 'bullet',
  start: 1,
  tag: 'ul',
  children: items.map((item, index) => ({
    type: 'listitem',
    ...base,
    value: index + 1,
    checked: undefined,
    children: [text(item)],
  })),
})

export const FIRST_POST_TITLE = 'Plan your Q4 in one sitting: the five decisions that matter'

export const FIRST_POST_EXCERPT =
  'Most Q4 plans die because they try to answer forty questions. There are five that decide the quarter, and you can settle all of them in an afternoon.'

export const FIRST_POST_BODY = {
  root: {
    type: 'root',
    ...base,
    children: [
      p(
        text(
          'Every year the same thing happens. October arrives, the calendar is still a list of ideas in three different places, and the first promotion goes out late because nobody could agree what the offer was. The quarter that decides the year gets planned in the week it starts.',
        ),
      ),
      p(
        text('It is not a discipline problem. It is a '),
        bold('scope'),
        text(
          ' problem: most planning sessions try to answer forty questions at once and stall on question six. There are five decisions that actually shape the quarter. Settle those, and everything else is execution.',
        ),
      ),

      h2('1. What are you promoting, and when?'),
      p(
        text(
          'One line per promotion, on one page, with dates. Not a strategy document — a calendar. If you cannot see the whole quarter without scrolling, it is too detailed to be useful.',
        ),
      ),
      p(
        text('Most stores need fewer promotions than they run. Three that are properly supported beat seven that each get half a day of attention.'),
      ),

      h2('2. What is the offer, exactly?'),
      p(
        text(
          'Not "20% off" — what the customer sees, what they get, and why it ends. An offer with no reason to act now is a discount you gave away to people who were going to buy anyway.',
        ),
      ),
      ul(
        'The headline offer, in the words a customer would use',
        'What it applies to, and what it does not',
        'When it ends, and what happens after',
      ),

      h2('3. What has to be built before October?'),
      p(
        text(
          'Every promotion has a build list: the emails, the images, the landing page, the product data. Write it down in September and it is a to-do list. Discover it in October and it is a crisis.',
        ),
      ),
      quote(
        'The date you need is not the launch date. It is the build-by date, which is two weeks earlier and the one nobody writes down.',
      ),

      h2('4. What does email and SMS actually send?'),
      p(
        text(
          'Campaigns are the visible half. The flows are the half that runs while you sleep — welcome, abandoned cart, browse abandonment, post-purchase. Going into Q4 with those switched off is leaving money on a table you already paid for.',
        ),
      ),

      h2('5. What is paid social allowed to spend?'),
      p(
        text(
          'A number, decided in advance, with a rule for when it goes up. Ads work best when the offer and the retention flows are already doing their jobs — that is what makes the traffic affordable, not a better audience.',
        ),
      ),

      h2('Where to start'),
      p(
        text(
          'Take an afternoon. Answer the five questions in order, write each answer in one sentence, and stop. A plan you can hold in your head is a plan you will follow in November.',
        ),
      ),
      p(
        text('We build exactly this, live, in ninety minutes at the '),
        link('Q4 Revenue Playbook masterclass', '/masterclass'),
        text('. Bring your calendar and leave with it filled in.'),
      ),
    ],
  },
}
