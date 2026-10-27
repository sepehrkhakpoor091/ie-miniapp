/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * EventDetailsDrawer — Normalized Event Details & Checkout Drawer
 * Ensures every event is normalized via normalizeEvent(ev) before rendering.
 */

import React from 'react';
import {
  AdminReceiptItem,
  DiscountRuleConfig,
  EventItem,
  ThemeMode,
  TicketRecord,
  UserProfile,
} from '../../types';
import { normalizeEvent } from '../../utils/events';
import { CheckoutDrawer } from './CheckoutDrawer';

export interface EventDetailsDrawerProps {
  event: EventItem | null;
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  themeMode: ThemeMode;
  discountRule?: Partial<DiscountRuleConfig> & {
    pointsUnit?: number;
    discountToman?: number;
  };
  onCompleteRegistration: (
    ticket: TicketRecord,
    pointsDeducted: number,
    pointsEarned: number
  ) => void;
  onSubmitReceipt?: (receipt: AdminReceiptItem) => void;
  onRefreshFromServer?: () => Promise<void> | void;
}

export const EventDetailsDrawer: React.FC<EventDetailsDrawerProps> = (props) => {
  const safeEvent = props.event ? normalizeEvent(props.event) : null;
  return <CheckoutDrawer {...props} event={safeEvent} />;
};

export default EventDetailsDrawer;
