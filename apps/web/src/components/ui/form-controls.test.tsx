// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Input } from './input';
import { Label } from './label';
import { Select } from './select';
import { Table, TBody, TD, TH, THead, TR } from './table';

describe('Input', () => {
  it('renders a text input and merges class names', () => {
    render(<Input aria-label="Name" className="custom" defaultValue="x" />);
    const input = screen.getByLabelText('Name');
    expect(input.tagName).toBe('INPUT');
    expect(input).toHaveClass('custom');
    expect(input).toHaveValue('x');
  });
});

describe('Label', () => {
  it('associates with a control via htmlFor', () => {
    render(
      <>
        <Label htmlFor="f" className="custom">
          Field
        </Label>
        <input id="f" />
      </>,
    );
    const label = screen.getByText('Field');
    expect(label).toHaveClass('custom');
    expect(label).toHaveAttribute('for', 'f');
  });
});

describe('Select', () => {
  it('renders options and merges class names', () => {
    render(
      <Select aria-label="Pick" className="custom" defaultValue="b">
        <option value="a">A</option>
        <option value="b">B</option>
      </Select>,
    );
    const select = screen.getByLabelText('Pick');
    expect(select.tagName).toBe('SELECT');
    expect(select).toHaveClass('custom');
    expect(select).toHaveValue('b');
  });
});

describe('Table', () => {
  it('renders a semantic table with head and body', () => {
    render(
      <Table>
        <THead>
          <TR>
            <TH>Name</TH>
          </TR>
        </THead>
        <TBody>
          <TR>
            <TD>agent-dev</TD>
          </TR>
        </TBody>
      </Table>,
    );
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Name' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'agent-dev' })).toBeInTheDocument();
  });
});
