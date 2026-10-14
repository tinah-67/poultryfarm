/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';
import { getRecommendedFeedType } from '../src/screens/FeedScreen';

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});

test('does not enforce broiler-specific feed stages', () => {
  expect(getRecommendedFeedType(null)).toBeNull();
  expect(getRecommendedFeedType(7)).toBeNull();
  expect(getRecommendedFeedType(21)).toBeNull();
  expect(getRecommendedFeedType(35)).toBeNull();
  expect(getRecommendedFeedType(120)).toBeNull();
});
