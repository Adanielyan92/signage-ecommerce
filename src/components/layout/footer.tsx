import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-neutral-50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">Products</h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link
                  href="/products"
                  className="text-sm text-neutral-500 hover:text-neutral-900"
                >
                  Channel Letters
                </Link>
              </li>
              <li>
                <Link
                  href="/configure/front-lit-trim-cap"
                  className="text-sm text-neutral-500 hover:text-neutral-900"
                >
                  Design Your Sign
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-neutral-900">Support</h3>
            <ul className="mt-4 space-y-2">
              <li>
                <span className="text-sm text-neutral-500">
                  support@gatsoftsigns.com
                </span>
              </li>
              <li>
                <span className="text-sm text-neutral-500">
                  1-800-SIGNAGE
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-neutral-900">Company</h3>
            <ul className="mt-4 space-y-2">
              <li>
                <span className="text-sm text-neutral-500">About Us</span>
              </li>
              <li>
                <span className="text-sm text-neutral-500">
                  Terms & Conditions
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-neutral-200 pt-8">
          <p className="text-center text-xs text-neutral-400">
            &copy; {new Date().getFullYear()} GatSoft Signs. All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
