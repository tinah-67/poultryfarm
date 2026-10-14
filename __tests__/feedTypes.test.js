import { FEED_TYPE_OPTIONS, getFeedStageGuidance } from '../src/constants/feedTypes';

describe('feed type guidance', () => {
  test('keeps a neutral feed choice list without broiler-specific age enforcement', () => {
    expect(FEED_TYPE_OPTIONS).toEqual(['starter', 'grower', 'finisher', 'other']);
    expect(getFeedStageGuidance(10)).toBeNull();
    expect(getFeedStageGuidance(40)).toBeNull();
  });
});
