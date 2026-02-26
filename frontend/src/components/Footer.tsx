export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    // 'fixed bottom-0' makes it stay at the bottom of the screen (static)
    // 'justify-center' centers the text
    <footer className="fixed bottom-0 left-0 w-full py-3 bg-white border-t border-gray-200 z-50">
      <div className="max-w-7xl mx-auto flex justify-center items-center text-xs text-gray-400 font-sans">
        © {currentYear} 1ClickClaim. All rights reserved.
      </div>
    </footer>
  );
};