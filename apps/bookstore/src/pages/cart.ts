// The basket.
//
// Quantity edits patch one number and two totals. Only adding or removing a
// line rebuilds the list, because `<e-list>` adopts its rows at connect time —
// so a row cannot simply be appended afterwards.

import { bookById, FORMAT_LABELS, type Book } from '../books';
import { div, h, onDetail, setAttr, setText, t } from '../dom';
import { eur, FREE_DELIVERY_THRESHOLD } from '../format';
import { announce } from '../announce';
import { bookHref, catalogHref, navigate } from '../router';
import {
  applyVoucher,
  cartSummary,
  clearVoucher,
  onStateChange,
  removeFromCart,
  state,
  updateCartQuantity,
  VOUCHERS,
  type CartLine,
  type VoucherRejection,
} from '../state';
import { coverFor } from '../ui';
import type { Page } from '../page';

interface RenderedLine {
  quantityControl: HTMLElement;
  lineTotal: HTMLElement;
}

let repaint: (() => void) | null = null;

/** Recompute and repaint the basket totals. */
export function updateCartSummary(): void {
  repaint?.();
}

export function createCartPage(): Page {
  const rows = new Map<string, RenderedLine>();
  let renderedIds = '';

  const listSlot = div('shop-cart__list');
  const emptyAction = t('e-button', { slot: 'action', variant: 'primary' }, 'Browse the catalogue');
  const emptyState = h(
    'e-empty',
    {
      icon: 'folder',
      title: 'Your basket is empty',
      description:
        'Nothing is reserved until it is in the basket. Everything in print is one click away.',
    },
    [emptyAction],
  );
  emptyAction.addEventListener('e-click', () => navigate(catalogHref({})));

  const freeDelivery = h('e-progress', {
    variant: 'steps',
    steps: 10,
    value: 0,
    max: FREE_DELIVERY_THRESHOLD,
    label: 'Towards free delivery',
  });
  const freeDeliveryNote = t('e-text', { kind: 'small', as: 'p' }, '');

  const voucherInput = h('e-input', {
    label: 'Voucher code',
    placeholder: 'INKBOUND10',
    hint: `Demo codes: ${VOUCHERS.map((voucher) => voucher.code).join(', ')}`,
  });
  const voucherApply = t('e-button', {}, 'Apply');
  const voucherRemove = t('e-button', { variant: 'destructive' }, 'Remove voucher');
  const voucherAlertText = t('span', {}, '');
  const voucherAlert = h('e-alert', { variant: 'info', heading: '', closable: true }, [
    voucherAlertText,
  ]);
  voucherAlert.hidden = true;

  const totalsSlot = div('shop-cart__totals');

  const checkoutButton = t('e-button', { variant: 'primary' }, 'Continue to checkout');
  checkoutButton.addEventListener('e-click', () => navigate('/checkout'));

  const el = div('shop-page shop-page--cart', [
    h('header', { class: 'shop-masthead' }, [
      t('e-title', { level: 1 }, 'Basket'),
      t(
        'e-text',
        { kind: 'prose', as: 'p', class: 'shop-lede' },
        'Nothing is charged here. Quantities update the totals immediately; removing a title asks ' +
          'first, because an accidental tap is expensive on a panel you cannot undo quickly.',
      ),
    ]),
    div('shop-cart', [
      div('shop-cart__lines', [listSlot, emptyState]),
      h('e-card', { class: 'shop-cart__summary', eyebrow: 'Order summary', title: 'Totals' }, [
        freeDelivery,
        freeDeliveryNote,
        h('e-divider', {}),
        totalsSlot,
        h('e-divider', { variant: 'dashed', label: 'Voucher' }),
        voucherInput,
        h('e-space', { size: 10, wrap: true }, [voucherApply, voucherRemove]),
        voucherAlert,
        h('e-divider', {}),
        checkoutButton,
        t('e-link', { href: `#${catalogHref({})}` }, 'Continue shopping'),
      ]),
    ]),
  ]);

  function buildRow(line: CartLine, book: Book): HTMLElement {
    const art = coverFor(book);
    const quantityControl = h('e-input-number', {
      value: line.quantity,
      min: 1,
      max: 99,
      step: 1,
    });
    const unit = book.formats.find((option) => option.id === line.format)?.price ?? 0;
    const lineTotal = t('span', { class: 'shop-cart__line-total' }, eur(unit * line.quantity));

    onDetail<{ value: number }>(quantityControl, 'e-change', () => {
      const raw = Number(quantityControl.getAttribute('value') ?? '1');
      const next = Number.isFinite(raw) ? Math.trunc(raw) : 1;
      updateCartQuantity(line.id, next);
      announce(`${book.title}: ${Math.max(1, next)} in the basket.`);
    });

    const remove = h(
      'e-popconfirm',
      {
        message: `Remove “${book.title}” from the basket?`,
        'confirm-label': 'Remove',
        'cancel-label': 'Keep it',
        align: 'right',
      },
      [t('e-button', { slot: 'trigger', variant: 'destructive' }, 'Remove')],
    );
    onDetail<{ value: boolean }>(remove, 'e-confirm', () => {
      removeFromCart(line.id);
      announce(`${book.title} removed from the basket.`);
    });

    rows.set(line.id, { quantityControl, lineTotal });

    return h('e-list-item', {}, [
      h(
        'a',
        { slot: 'leading', class: 'shop-cart__cover', href: `#${bookHref(book.id)}`, tabindex: -1 },
        [h('e-image', { src: art.src, alt: art.alt, fit: 'contain' })],
      ),
      div('shop-cart__actions', [
        h('e-form-item', { label: 'Quantity' }, [quantityControl]),
        lineTotal,
        remove,
      ]),
      div('shop-cart__line', [
        h('e-title', { level: 3 }, [t('a', { href: `#${bookHref(book.id)}` }, book.title)]),
        t('e-text', { kind: 'small', as: 'p' }, `${book.author} · ${book.isbn}`),
        h('e-space', { size: 8, wrap: true }, [
          t('e-badge', {}, FORMAT_LABELS[line.format]),
          t('e-badge', { inverted: true }, `${eur(unit)} each`),
        ]),
      ]),
    ]);
  }

  function renderLines(): void {
    rows.clear();
    const list = h('e-list', {
      bordered: true,
      'header-title': `${state.cart.length} title${state.cart.length === 1 ? '' : 's'} in the basket`,
    });
    for (const line of state.cart) {
      const book = bookById(line.id);
      if (!book) continue;
      list.appendChild(buildRow(line, book));
    }
    listSlot.replaceChildren(list);
  }

  function paint(): void {
    const ids = state.cart.map((line) => `${line.id}:${line.format}`).join('|');
    if (ids !== renderedIds) {
      renderedIds = ids;
      renderLines();
    } else {
      for (const line of state.cart) {
        const row = rows.get(line.id);
        const book = bookById(line.id);
        if (!row || !book) continue;
        const unit = book.formats.find((option) => option.id === line.format)?.price ?? 0;
        setAttr(row.quantityControl, 'value', String(line.quantity));
        setText(row.lineTotal, eur(unit * line.quantity));
      }
    }

    const summary = cartSummary('standard');
    const filled = state.cart.length > 0;
    setAttr(listSlot, 'hidden', filled ? null : '');
    setAttr(emptyState, 'hidden', filled ? '' : null);
    setAttr(checkoutButton, 'disabled', filled ? null : '');

    setAttr(freeDelivery, 'value', String(Math.min(summary.subtotal, FREE_DELIVERY_THRESHOLD)));
    setText(
      freeDeliveryNote,
      summary.freeDeliveryGap > 0
        ? `${eur(summary.freeDeliveryGap)} more for free standard delivery within Germany.`
        : 'Standard delivery within Germany is free on this order.',
    );

    const lines: Array<[string, string]> = [
      ['Subtotal', eur(summary.subtotal)],
      ['Delivery (standard)', summary.delivery === 0 ? 'Free' : eur(summary.delivery)],
    ];
    if (summary.discount > 0 && summary.voucher) {
      lines.push([`Voucher ${summary.voucher.code}`, `− ${eur(summary.discount)}`]);
    }
    lines.push(['Total', eur(summary.total)]);
    lines.push(['Included VAT (7 %)', eur(summary.vat)]);

    totalsSlot.replaceChildren(
      h(
        'e-description-list',
        { columns: 1, bordered: true },
        lines.map(([term, detail]) => t('e-desc-item', { term }, detail)),
      ),
    );

    setAttr(voucherRemove, 'hidden', state.voucher ? null : '');
    if (summary.voucher) {
      // Content only — whether the banner is showing stays with the customer,
      // who may have dismissed it.
      setAttr(voucherAlert, 'variant', 'success');
      setAttr(voucherAlert, 'heading', `Voucher ${summary.voucher.code} applied`);
      setText(voucherAlertText, summary.voucher.label);
    } else if (state.voucher) {
      // Held but no longer eligible: the basket fell below the minimum after a
      // removal. That is worth re-showing even if the banner was dismissed.
      voucherAlert.hidden = false;
      setAttr(voucherAlert, 'variant', 'warning');
      setAttr(voucherAlert, 'heading', 'Voucher not active');
      setText(
        voucherAlertText,
        'The basket no longer reaches the minimum goods value for this code.',
      );
    }
  }

  repaint = paint;

  voucherApply.addEventListener('e-click', () => {
    const code = voucherInput.getAttribute('value') ?? '';
    const outcome = applyVoucher(code);
    voucherAlert.hidden = false;
    if (outcome.ok) {
      setAttr(voucherAlert, 'variant', 'success');
      setAttr(voucherAlert, 'heading', `Voucher ${outcome.voucher.code} applied`);
      setText(voucherAlertText, outcome.voucher.label);
      announce(`Voucher applied: ${outcome.voucher.label}.`);
      return;
    }
    setAttr(voucherAlert, 'variant', 'error');
    setAttr(voucherAlert, 'heading', 'Voucher not applied');
    const reasons: Record<VoucherRejection, string> = {
      empty: 'Type a code first. The demo accepts INKBOUND10, PAPERBACK5 and FREEPOST.',
      unknown: 'That code is not one this demo shop knows.',
      minimum: 'This code needs a higher goods value than the basket currently holds.',
    };
    setText(voucherAlertText, reasons[outcome.reason]);
    announce(`Voucher rejected. ${reasons[outcome.reason]}`);
  });

  voucherRemove.addEventListener('e-click', () => {
    clearVoucher();
    voucherAlert.hidden = true;
    setAttr(voucherInput, 'value', '');
    announce('Voucher removed.');
  });

  onStateChange(paint);

  return {
    el,
    sider: null,
    enter() {
      paint();
      return {
        title: 'Basket',
        trail: [{ label: 'Shop', href: '#/' }, { label: 'Basket' }],
      };
    },
  };
}
