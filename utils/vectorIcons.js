/**
 * Thin Ionicons wrappers matching react-native-heroicons API ({ size, color }).
 * Keeps one icon font (@expo/vector-icons) instead of an extra SVG icon package.
 */
import React from 'react';
import { Ionicons } from '@expo/vector-icons';

function makeIcon(name) {
  function Icon({ size = 24, color = '#fff', style }) {
    return <Ionicons name={name} size={size} color={color} style={style} />;
  }
  Icon.displayName = `IonIcon(${name})`;
  return Icon;
}

export const CalendarDaysIcon = makeIcon('calendar-outline');
export const CalendarIcon = makeIcon('calendar-outline');
export const SignalIcon = makeIcon('radio-outline');
export const CheckCircleIcon = makeIcon('checkmark-circle-outline');
export const XCircleIcon = makeIcon('close-circle-outline');
export const PlusCircleIcon = makeIcon('add-circle-outline');
export const UserGroupIcon = makeIcon('people-outline');
export const TrophyIcon = makeIcon('trophy-outline');
export const CurrencyDollarIcon = makeIcon('cash-outline');
export const ClockIcon = makeIcon('time-outline');
export const StarIcon = makeIcon('star-outline');
export const ChevronDownIcon = makeIcon('chevron-down');
export const PuzzlePieceIcon = makeIcon('extension-puzzle-outline');
export const CreditCardIcon = makeIcon('card-outline');
