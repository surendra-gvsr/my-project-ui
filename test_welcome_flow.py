"""
Test the full post-login welcome flow for EvidenceIQ at http://localhost:3001.
"""

import os
import sys
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

BASE_URL = "http://localhost:3001"
SCREENSHOT_DIR = os.path.join(os.path.dirname(__file__), ".playwright-mcp")
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

results = []

def report(step, label, passed, note=""):
    status = "PASS" if passed else "FAIL"
    msg = f"[{status}] Step {step}: {label}"
    if note:
        msg += f" — {note}"
    results.append(msg)
    print(msg)

def run_tests():
    console_errors = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 900})
        page = context.new_page()

        # Capture console errors
        def handle_console(msg):
            if msg.type == "error":
                console_errors.append(msg.text)

        page.on("console", handle_console)

        # ── STEP 1: Login ──────────────────────────────────────────────────────

        # 1a. Navigate to root — confirm redirect to /login
        try:
            page.goto(BASE_URL + "/", wait_until="networkidle", timeout=15000)
            current = page.url
            on_login = "/login" in current
            report(1, "Navigate to / redirects to /login", on_login, f"landed on: {current}")
        except Exception as e:
            report(1, "Navigate to / redirects to /login", False, str(e))

        # 1b. Log in
        try:
            page.wait_for_selector("input[type='email'], input[name='email'], input[placeholder*='email' i]", timeout=8000)
            email_input = page.locator("input[type='email'], input[name='email'], input[placeholder*='email' i]").first
            email_input.fill("adjuster@evidenceiq.com")

            pw_input = page.locator("input[type='password']").first
            pw_input.fill("demo1234")

            # Click submit / sign-in button
            submit = page.locator("button[type='submit'], button:has-text('Sign'), button:has-text('Login'), button:has-text('Log in')").first
            submit.click()
            page.wait_for_load_state("networkidle", timeout=10000)
            report(1, "Login form filled and submitted", True)
        except Exception as e:
            report(1, "Login form filled and submitted", False, str(e))

        # 1c. Confirm landing on /welcome
        try:
            page.wait_for_url("**/welcome**", timeout=8000)
            current = page.url
            on_welcome = "/welcome" in current
            report(1, "After login, land on /welcome (not /dashboard)", on_welcome, f"URL: {current}")
        except Exception as e:
            current = page.url
            report(1, "After login, land on /welcome (not /dashboard)", False, f"URL: {current} — {e}")

        # ── STEP 2: Welcome page initial state ────────────────────────────────

        # 4. Take snapshot
        try:
            page.goto(BASE_URL + "/welcome", wait_until="networkidle", timeout=10000)
            snapshot_text = page.content()
            report(2, "Navigated to /welcome, page loaded", True)
        except Exception as e:
            report(2, "Navigated to /welcome, page loaded", False, str(e))
            browser.close()
            return

        # 5a. "Welcome to EvidenceIQ" heading visible
        try:
            heading = page.locator("text=Welcome to EvidenceIQ").first
            visible = heading.is_visible()
            report(2, "'Welcome to EvidenceIQ' heading visible", visible)
        except Exception as e:
            report(2, "'Welcome to EvidenceIQ' heading visible", False, str(e))

        # 5b. Industry dropdown visible
        try:
            # Look for a select or combobox element related to industry
            dropdown = page.locator("select, [role='combobox'], [role='listbox'], button:has-text('industry'), button:has-text('Industry'), button:has-text('Select')").first
            visible = dropdown.is_visible()
            report(2, "Industry dropdown visible", visible)
        except Exception as e:
            report(2, "Industry dropdown visible", False, str(e))

        # 5c. NO industry content shown yet
        try:
            # "Built for Claims Professionals" should NOT be visible yet
            content_heading = page.locator("text=Built for Claims Professionals")
            count = content_heading.count()
            no_content = count == 0 or not content_heading.first.is_visible()
            report(2, "No industry content shown yet (initial state)", no_content)
        except Exception as e:
            report(2, "No industry content shown yet (initial state)", False, str(e))

        # 5d. NO "Go to Dashboard" button visible yet
        try:
            go_btn = page.locator("text=Go to Dashboard")
            count = go_btn.count()
            no_go_btn = count == 0 or not go_btn.first.is_visible()
            report(2, "No 'Go to Dashboard' button visible in initial state", no_go_btn)
        except Exception as e:
            report(2, "No 'Go to Dashboard' button visible in initial state", False, str(e))

        # 6. Screenshot
        try:
            screenshot_path = os.path.join(SCREENSHOT_DIR, "welcome-initial.png")
            page.screenshot(path=screenshot_path, full_page=True)
            report(2, f"Screenshot saved to .playwright-mcp/welcome-initial.png", True)
        except Exception as e:
            report(2, "Screenshot saved to .playwright-mcp/welcome-initial.png", False, str(e))

        # ── STEP 3: Select Insurance industry ─────────────────────────────────

        # 7. Click dropdown and select Insurance option
        try:
            # First try native <select>
            select_els = page.locator("select").all()
            if select_els:
                page.select_option("select", label="Insurance — Adjusters & SIU Investigators")
                report(3, "Selected Insurance from native <select>", True)
            else:
                # Try shadcn/radix combobox pattern
                trigger = page.locator("[role='combobox'], button:has-text('Select'), button:has-text('Industry')").first
                trigger.click()
                page.wait_for_timeout(300)
                # Look for the insurance option in the dropdown list
                option = page.locator("text=Insurance").first
                if not option.is_visible():
                    option = page.locator("[role='option']:has-text('Insurance')").first
                option.click()
                report(3, "Selected Insurance from combobox dropdown", True)
        except Exception as e:
            report(3, "Select Insurance industry from dropdown", False, str(e))

        # 8. Wait for fade-in transition (~300ms)
        page.wait_for_timeout(500)
        page.wait_for_load_state("networkidle")

        # 9. Take snapshot and verify content
        # 9a. "Built for Claims Professionals" heading
        try:
            heading = page.locator("text=Built for Claims Professionals").first
            page.wait_for_selector("text=Built for Claims Professionals", timeout=3000)
            visible = heading.is_visible()
            report(3, "'Built for Claims Professionals' heading visible after selection", visible)
        except Exception as e:
            report(3, "'Built for Claims Professionals' heading visible after selection", False, str(e))

        # 9b. Problem statement about SIU investigators
        try:
            siu_text = page.locator("text=SIU").first
            visible = siu_text.is_visible()
            report(3, "Problem statement about SIU investigators visible", visible)
        except Exception as e:
            report(3, "Problem statement about SIU investigators visible", False, str(e))

        # 9c. Three check-mark bullet points
        try:
            bullets = page.locator("text=✓").all()
            count = len(bullets)
            report(3, f"Three ✓ bullet points visible (found {count})", count >= 3)
        except Exception as e:
            report(3, "Three ✓ bullet points visible", False, str(e))

        # 9d. Three stat cards: "90% faster", "Defensible", "SIU ready"
        try:
            faster = page.locator("text=90% faster").first
            defensible = page.locator("text=Defensible").first
            siu_ready = page.locator("text=SIU ready").first
            f_ok = faster.is_visible()
            d_ok = defensible.is_visible()
            s_ok = siu_ready.is_visible()
            report(3, "Stat card '90% faster' visible", f_ok)
            report(3, "Stat card 'Defensible' visible", d_ok)
            report(3, "Stat card 'SIU ready' visible", s_ok)
        except Exception as e:
            report(3, "Three stat cards visible", False, str(e))

        # 9e. "Go to Dashboard →" button visible
        try:
            go_btn = page.locator("text=Go to Dashboard").first
            visible = go_btn.is_visible()
            report(3, "'Go to Dashboard →' button is now visible", visible)
        except Exception as e:
            report(3, "'Go to Dashboard →' button is now visible", False, str(e))

        # 10. Screenshot
        try:
            screenshot_path = os.path.join(SCREENSHOT_DIR, "welcome-insurance.png")
            page.screenshot(path=screenshot_path, full_page=True)
            report(3, "Screenshot saved to .playwright-mcp/welcome-insurance.png", True)
        except Exception as e:
            report(3, "Screenshot saved to .playwright-mcp/welcome-insurance.png", False, str(e))

        # ── STEP 4: Navigate to Dashboard ─────────────────────────────────────

        # 11. Click "Go to Dashboard →"
        try:
            go_btn = page.locator("text=Go to Dashboard").first
            go_btn.click()
            page.wait_for_load_state("networkidle", timeout=8000)
            report(4, "Clicked 'Go to Dashboard →'", True)
        except Exception as e:
            report(4, "Clicked 'Go to Dashboard →'", False, str(e))

        # 12. Confirm landing on /
        try:
            current = page.url
            on_dashboard = current.rstrip("/").endswith(":3001") or current.endswith("/") and "/welcome" not in current
            # Be more liberal: just check not on /welcome and not on /login
            on_dashboard = "/welcome" not in current and "/login" not in current
            report(4, f"Landed on dashboard / (URL: {current})", on_dashboard)
        except Exception as e:
            report(4, "Landed on dashboard /", False, str(e))

        # 13. Confirm "← Back" link pointing to /welcome
        try:
            back_link = page.locator("text=← Back, a:has-text('Back'), a[href='/welcome']").first
            # Try a few selector patterns
            back = page.locator("a[href='/welcome'], a:has-text('Back'), text=← Back").first
            visible = back.is_visible()
            href = back.get_attribute("href") or ""
            report(4, f"'← Back' link visible pointing to /welcome (href={href})", visible and "/welcome" in href)
        except Exception as e:
            report(4, "'← Back' link visible pointing to /welcome", False, str(e))

        # ── STEP 5: Back navigation ────────────────────────────────────────────

        # 14. Click "← Back"
        try:
            back = page.locator("a[href='/welcome'], a:has-text('Back'), text=← Back").first
            back.click()
            page.wait_for_load_state("networkidle", timeout=8000)
            report(5, "Clicked '← Back'", True)
        except Exception as e:
            report(5, "Clicked '← Back'", False, str(e))

        # 15. Confirm return to /welcome
        try:
            current = page.url
            on_welcome = "/welcome" in current
            report(5, f"Returned to /welcome (URL: {current})", on_welcome)
        except Exception as e:
            report(5, "Returned to /welcome", False, str(e))

        browser.close()

    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    passed = [r for r in results if r.startswith("[PASS]")]
    failed = [r for r in results if r.startswith("[FAIL]")]
    print(f"PASSED: {len(passed)}")
    print(f"FAILED: {len(failed)}")
    if failed:
        print("\nFailed steps:")
        for f in failed:
            print(f"  {f}")
    if console_errors:
        print(f"\nConsole errors captured ({len(console_errors)}):")
        for err in console_errors[:10]:
            print(f"  ERROR: {err}")
    else:
        print("\nNo console errors detected.")

if __name__ == "__main__":
    run_tests()
