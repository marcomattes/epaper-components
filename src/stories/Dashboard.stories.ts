import type { Meta, StoryObj } from "@storybook/html";

const meta: Meta = {
  title: "Pages/Dashboard",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

export const ReaderDashboard: Story = {
  name: "E-Reader Dashboard",
  render: () => `
    <div style="max-width:72rem;margin-inline:auto;padding:var(--epaper-space-6)">
      <div class="epaper-stack--lg">

        <!-- Header -->
        <div class="epaper-page-header" style="margin-bottom:var(--epaper-space-7)">
          <div style="display:flex;justify-content:space-between;align-items:center;padding:var(--epaper-space-4) var(--epaper-space-5)">
            <strong style="font-size:1.25rem">Reader Dashboard</strong>
            <span class="epaper-text-sm eink-text-muted">Last sync: 2 min ago</span>
          </div>
        </div>

        <!-- Stats row -->
        <div class="epaper-grid" style="--epaper-grid-min:14rem;gap:var(--epaper-space-5);margin-bottom:var(--epaper-space-7)">
          <div class="epaper-card">
            <div class="epaper-card__body" style="padding:var(--epaper-space-5)">
              <div class="epaper-stat">
                <div class="epaper-stat__label">Books Read</div>
                <div class="epaper-stat__value">47</div>
                <div class="epaper-stat__delta">+3 this month</div>
              </div>
            </div>
          </div>
          <div class="epaper-card">
            <div class="epaper-card__body" style="padding:var(--epaper-space-5)">
              <div class="epaper-stat">
                <div class="epaper-stat__label">Reading Time</div>
                <div class="epaper-stat__value">128h</div>
                <div class="epaper-stat__delta">+12h this week</div>
              </div>
            </div>
          </div>
          <div class="epaper-card">
            <div class="epaper-card__body" style="padding:var(--epaper-space-5)">
              <div class="epaper-stat">
                <div class="epaper-stat__label">Highlights</div>
                <div class="epaper-stat__value">312</div>
                <div class="epaper-stat__delta">+28 this week</div>
              </div>
            </div>
          </div>
          <div class="epaper-card">
            <div class="epaper-card__body" style="padding:var(--epaper-space-5)">
              <div class="epaper-stat">
                <div class="epaper-stat__label">Battery</div>
                <div class="epaper-stat__value">73%</div>
                <div class="epaper-stat__delta">~9 days remaining</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Two-column: current reads + activity -->
        <div class="epaper-grid" style="--epaper-grid-min:24rem;gap:var(--epaper-space-5);margin-bottom:var(--epaper-space-7)">

          <!-- Currently Reading -->
          <div class="epaper-card">
            <div class="epaper-card__title" style="padding:var(--epaper-space-4) var(--epaper-space-5)">Currently Reading</div>
            <div class="epaper-card__body" style="padding:var(--epaper-space-5)">
              <div class="epaper-stack" style="--epaper-stack-gap:var(--epaper-space-5)">
                <div>
                  <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:var(--epaper-space-2)">
                    <strong>Designing for E-Ink</strong>
                    <span class="epaper-text-xs eink-text-muted">78%</span>
                  </div>
                  <div class="epaper-progress" role="progressbar" aria-valuenow="78" aria-valuemin="0" aria-valuemax="100" aria-label="Book progress" style="margin-bottom:var(--epaper-space-2)">
                    <div class="epaper-progress__track"><div class="epaper-progress__bar" style="width:78%"></div></div>
                  </div>
                  <span class="epaper-text-xs eink-text-muted">Ch. 12 of 15 &middot; ~45 min left</span>
                </div>
                <hr class="epaper-divider">
                <div>
                  <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:var(--epaper-space-2)">
                    <strong>The Art of Simplicity</strong>
                    <span class="epaper-text-xs eink-text-muted">34%</span>
                  </div>
                  <div class="epaper-progress" role="progressbar" aria-valuenow="34" aria-valuemin="0" aria-valuemax="100" aria-label="Book progress" style="margin-bottom:var(--epaper-space-2)">
                    <div class="epaper-progress__track"><div class="epaper-progress__bar" style="width:34%"></div></div>
                  </div>
                  <span class="epaper-text-xs eink-text-muted">Ch. 5 of 14 &middot; ~3h left</span>
                </div>
                <hr class="epaper-divider">
                <div>
                  <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:var(--epaper-space-2)">
                    <strong>Low-Power Interfaces</strong>
                    <span class="epaper-text-xs eink-text-muted">12%</span>
                  </div>
                  <div class="epaper-progress" role="progressbar" aria-valuenow="12" aria-valuemin="0" aria-valuemax="100" aria-label="Book progress" style="margin-bottom:var(--epaper-space-2)">
                    <div class="epaper-progress__track"><div class="epaper-progress__bar" style="width:12%"></div></div>
                  </div>
                  <span class="epaper-text-xs eink-text-muted">Ch. 2 of 18 &middot; ~8h left</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Recent Activity -->
          <div class="epaper-card">
            <div class="epaper-card__title" style="padding:var(--epaper-space-4) var(--epaper-space-5)">Recent Activity</div>
            <div class="epaper-card__body" style="padding:var(--epaper-space-5)">
              <ol class="epaper-timeline">
                <li class="epaper-timeline__item eink-timeline__item--active">
                  <span class="epaper-timeline__time">Today, 09:14</span>
                  <div class="epaper-timeline__title">Highlight added</div>
                  <div class="epaper-timeline__body">"Designing for E-Ink" &mdash; Ch. 12</div>
                </li>
                <li class="epaper-timeline__item">
                  <span class="epaper-timeline__time">Today, 08:30</span>
                  <div class="epaper-timeline__title">Reading session</div>
                  <div class="epaper-timeline__body">44 minutes &middot; 18 pages</div>
                </li>
                <li class="epaper-timeline__item">
                  <span class="epaper-timeline__time">Yesterday</span>
                  <div class="epaper-timeline__title">Book finished</div>
                  <div class="epaper-timeline__body">"Monochrome Thinking" &mdash; rated 4/5</div>
                </li>
                <li class="epaper-timeline__item">
                  <span class="epaper-timeline__time">Yesterday</span>
                  <div class="epaper-timeline__title">Firmware updated</div>
                  <div class="epaper-timeline__body">v3.4.1 &mdash; improved text rendering</div>
                </li>
                <li class="epaper-timeline__item">
                  <span class="epaper-timeline__time">Nov 13</span>
                  <div class="epaper-timeline__title">New book added</div>
                  <div class="epaper-timeline__body">"Low-Power Interfaces" synced via Wi-Fi</div>
                </li>
              </ol>
            </div>
          </div>
        </div>

        <!-- Library table -->
        <div class="epaper-card" style="margin-bottom:var(--epaper-space-7)">
          <div class="epaper-card__title" style="padding:var(--epaper-space-4) var(--epaper-space-5)">Library Overview</div>
          <div class="epaper-card__body" style="padding:0 var(--epaper-space-5) var(--epaper-space-5)">
            <div class="epaper-table-wrap">
              <table class="epaper-table eink-table--striped">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Author</th>
                    <th>Progress</th>
                    <th>Status</th>
                    <th>Last Read</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Designing for E-Ink</td>
                    <td>M. Richter</td>
                    <td>78%</td>
                    <td><span class="epaper-badge">Reading</span></td>
                    <td>Today</td>
                  </tr>
                  <tr>
                    <td>The Art of Simplicity</td>
                    <td>K. Tanaka</td>
                    <td>34%</td>
                    <td><span class="epaper-badge">Reading</span></td>
                    <td>Yesterday</td>
                  </tr>
                  <tr>
                    <td>Low-Power Interfaces</td>
                    <td>L. Chen</td>
                    <td>12%</td>
                    <td><span class="epaper-badge">Reading</span></td>
                    <td>Nov 12</td>
                  </tr>
                  <tr>
                    <td>Monochrome Thinking</td>
                    <td>A. Berg</td>
                    <td>100%</td>
                    <td><span class="epaper-tag eink-tag--filled">Finished</span></td>
                    <td>Yesterday</td>
                  </tr>
                  <tr>
                    <td>Reflective Display Handbook</td>
                    <td>S. Patel</td>
                    <td>100%</td>
                    <td><span class="epaper-tag eink-tag--filled">Finished</span></td>
                    <td>Nov 8</td>
                  </tr>
                  <tr>
                    <td>Paper Screens</td>
                    <td>J. Weber</td>
                    <td>0%</td>
                    <td><span class="epaper-tag eink-tag--muted">Queued</span></td>
                    <td>&mdash;</td>
                  </tr>
                  <tr>
                    <td>Sustainable UI</td>
                    <td>F. Duval</td>
                    <td>0%</td>
                    <td><span class="epaper-tag eink-tag--muted">Queued</span></td>
                    <td>&mdash;</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div class="epaper-card__footer" style="padding:var(--epaper-space-4) var(--epaper-space-5)">
            <nav aria-label="Pagination" class="epaper-pagination">
              <ol class="epaper-pagination__list">
                <li><a class="epaper-pagination__link" aria-disabled="true" href="#" tabindex="-1">Prev</a></li>
                <li><a class="epaper-pagination__link" aria-current="page" href="#">1</a></li>
                <li><a class="epaper-pagination__link" href="#">2</a></li>
                <li><a class="epaper-pagination__link" href="#">3</a></li>
                <li><a class="epaper-pagination__link" href="#">Next</a></li>
              </ol>
            </nav>
          </div>
        </div>

        <!-- Bottom row: quick actions + storage + goals -->
        <div class="epaper-grid" style="--epaper-grid-min:18rem;gap:var(--epaper-space-5);margin-bottom:var(--epaper-space-7)">
          <div class="epaper-card">
            <div class="epaper-card__title" style="padding:var(--epaper-space-4) var(--epaper-space-5)">Quick Actions</div>
            <div class="epaper-card__body" style="padding:var(--epaper-space-5)">
              <div class="epaper-stack" style="--epaper-stack-gap:var(--epaper-space-4)">
                <button class="epaper-btn epaper-btn--primary" style="width:100%">Sync Library</button>
                <button class="epaper-btn epaper-btn--secondary" style="width:100%">Export Highlights</button>
                <button class="epaper-btn epaper-btn--ghost" style="width:100%">Device Settings</button>
              </div>
            </div>
          </div>

          <div class="epaper-card">
            <div class="epaper-card__title" style="padding:var(--epaper-space-4) var(--epaper-space-5)">Storage</div>
            <div class="epaper-card__body" style="padding:var(--epaper-space-5)">
              <div class="epaper-stack" style="--epaper-stack-gap:var(--epaper-space-4)">
                <div class="epaper-loader" role="progressbar" aria-valuenow="62" aria-valuemin="0" aria-valuemax="100" aria-label="Storage used">
                  <span class="epaper-loader__label">Used</span>
                  <div class="epaper-loader__track">
                    <div class="epaper-loader__fill" style="--epaper-loader-value:62%"></div>
                  </div>
                  <span class="epaper-loader__label" aria-hidden="true">62%</span>
                </div>
                <dl class="epaper-dl eink-dl--horizontal eink-dl--bordered">
                  <dt class="epaper-dl__term">Total</dt>
                  <dd class="epaper-dl__detail">8 GB</dd>
                  <dt class="epaper-dl__term">Used</dt>
                  <dd class="epaper-dl__detail">4.96 GB</dd>
                  <dt class="epaper-dl__term">Books</dt>
                  <dd class="epaper-dl__detail">3.2 GB (147 titles)</dd>
                  <dt class="epaper-dl__term">System</dt>
                  <dd class="epaper-dl__detail">1.76 GB</dd>
                </dl>
              </div>
            </div>
          </div>

          <div class="epaper-card">
            <div class="epaper-card__title" style="padding:var(--epaper-space-4) var(--epaper-space-5)">Reading Goals</div>
            <div class="epaper-card__body" style="padding:var(--epaper-space-5)">
              <div class="epaper-stack" style="--epaper-stack-gap:var(--epaper-space-5)">
                <div>
                  <div style="display:flex;justify-content:space-between;margin-bottom:var(--epaper-space-2)">
                    <span class="epaper-text-sm">2025 goal</span>
                    <span class="epaper-text-sm eink-text-muted">47 / 52 books</span>
                  </div>
                  <div class="epaper-progress" role="progressbar" aria-valuenow="90" aria-valuemin="0" aria-valuemax="100" aria-label="Yearly reading goal">
                    <div class="epaper-progress__track"><div class="epaper-progress__bar" style="width:90%"></div></div>
                  </div>
                </div>
                <hr class="epaper-divider">
                <div>
                  <div style="display:flex;justify-content:space-between;margin-bottom:var(--epaper-space-2)">
                    <span class="epaper-text-sm">Daily streak</span>
                    <span class="epaper-text-sm eink-text-muted">14 days</span>
                  </div>
                  <div class="epaper-progress" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100" aria-label="Daily streak">
                    <div class="epaper-progress__track"><div class="epaper-progress__bar" style="width:100%"></div></div>
                  </div>
                </div>
                <hr class="epaper-divider">
                <div>
                  <div style="display:flex;justify-content:space-between;margin-bottom:var(--epaper-space-2)">
                    <span class="epaper-text-sm">Nov pages</span>
                    <span class="epaper-text-sm eink-text-muted">842 / 1000</span>
                  </div>
                  <div class="epaper-progress" role="progressbar" aria-valuenow="84" aria-valuemin="0" aria-valuemax="100" aria-label="Monthly pages goal">
                    <div class="epaper-progress__track"><div class="epaper-progress__bar" style="width:84%"></div></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="epaper-page-footer">
          <div style="display:flex;justify-content:space-between;align-items:center;padding:var(--epaper-space-4) var(--epaper-space-5)">
            <span class="epaper-text-xs eink-text-muted">Kindle Paperwhite &middot; Firmware 3.4.1</span>
            <span class="epaper-text-xs eink-text-muted">Wi-Fi connected</span>
          </div>
        </div>
      </div>
    </div>`,
};
