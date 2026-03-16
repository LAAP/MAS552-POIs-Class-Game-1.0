import type { AmenityCategory } from '../types';

export const AMENITY_CATEGORIES: AmenityCategory[] = [
  {
    id: 'grocery',
    label: 'Grocery / Supermarket',
    icon: '🛒',
    osmTags: [
      { key: 'shop', value: 'supermarket' },
      { key: 'shop', value: 'grocery' },
    ],
  },
  {
    id: 'convenience_store',
    label: 'Convenience Store',
    icon: '🏪',
    osmTags: [{ key: 'shop', value: 'convenience' }],
  },
  {
    id: 'school',
    label: 'School',
    icon: '🏫',
    osmTags: [{ key: 'amenity', value: 'school' }],
  },
  {
    id: 'pharmacy',
    label: 'Pharmacy',
    icon: '💊',
    osmTags: [{ key: 'amenity', value: 'pharmacy' }],
  },
  {
    id: 'hospital',
    label: 'Hospital / Clinic',
    icon: '🏥',
    osmTags: [
      { key: 'amenity', value: 'hospital' },
      { key: 'amenity', value: 'clinic' },
    ],
  },
  {
    id: 'park',
    label: 'Park',
    icon: '🌳',
    osmTags: [{ key: 'leisure', value: 'park' }],
  },
  {
    id: 'cafe',
    label: 'Café',
    icon: '☕',
    osmTags: [{ key: 'amenity', value: 'cafe' }],
  },
  {
    id: 'restaurant',
    label: 'Restaurant',
    icon: '🍽️',
    osmTags: [{ key: 'amenity', value: 'restaurant' }],
  },
  {
    id: 'bus_stop',
    label: 'Bus Stop',
    icon: '🚌',
    osmTags: [
      { key: 'highway', value: 'bus_stop' },
      { key: 'public_transport', value: 'platform' },
    ],
  },
  {
    id: 'train_station',
    label: 'Train / Metro Station',
    icon: '🚉',
    osmTags: [
      { key: 'railway', value: 'station' },
      { key: 'railway', value: 'halt' },
      { key: 'station', value: 'subway' },
    ],
  },
  {
    id: 'bank',
    label: 'Bank / ATM',
    icon: '🏦',
    osmTags: [
      { key: 'amenity', value: 'bank' },
      { key: 'amenity', value: 'atm' },
    ],
  },
  {
    id: 'gym',
    label: 'Gym',
    icon: '💪',
    osmTags: [
      { key: 'leisure', value: 'fitness_centre' },
      { key: 'leisure', value: 'sports_centre' },
    ],
  },
  {
    id: 'library',
    label: 'Library',
    icon: '📚',
    osmTags: [{ key: 'amenity', value: 'library' }],
  },
];
