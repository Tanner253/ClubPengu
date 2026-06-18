/** Day 1 nametag unlock closed — accounts created on/after this date cannot unlock it. */
export const DAY1_NAMETAG_CLOSE_DATE = new Date(
    process.env.DAY1_NAMETAG_CLOSE_ISO || '2026-06-18T00:00:00.000Z',
);

export const DAY1_SUPPORTER_STAMP_ID = 'day1_supporter';
