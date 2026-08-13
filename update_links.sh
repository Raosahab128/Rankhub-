#!/bin/bash
# Script to update links to relative paths with .html
files=$(find . -maxdepth 2 -name "*.html")
for file in $files; do
  sed -i 's|href="/exams"|href="./exams.html"|g' "$file"
  sed -i 's|href="/practice"|href="./practice.html"|g' "$file"
  sed -i 's|href="/pyq"|href="./pyq.html"|g' "$file"
  sed -i 's|href="/signin"|href="./signin.html"|g' "$file"
  sed -i 's|href="/signup"|href="./signup.html"|g' "$file"
  sed -i 's|href="/profile"|href="./profile.html"|g' "$file"
  sed -i 's|href="/performance"|href="./performance.html"|g' "$file"
  sed -i 's|href="/rankhub-pass"|href="./rankhub-pass.html"|g' "$file"
  sed -i 's|href="/test-interface"|href="./test-interface.html"|g' "$file"
  sed -i 's|href="/test-result"|href="./test-result.html"|g' "$file"
  sed -i 's|href="/exam-detail"|href="./exam-detail.html"|g' "$file"
  sed -i 's|href="/pyq-detail"|href="./pyq-detail.html"|g' "$file"
  sed -i 's|href="/notes"|href="./notes.html"|g' "$file"
  sed -i 's|href="/current-affairs"|href="./current-affairs.html"|g' "$file"
  sed -i 's|href="/live-tests"|href="./live-tests.html"|g' "$file"
  sed -i 's|href="/about"|href="./about.html"|g' "$file"
  sed -i 's|href="/contact"|href="./contact.html"|g' "$file"
  sed -i 's|href="/privacy"|href="./privacy.html"|g' "$file"
  sed -i 's|href="/terms"|href="./terms.html"|g' "$file"
  sed -i 's|href="/saved"|href="./saved.html"|g' "$file"
  sed -i 's|href="/notifications"|href="./notifications.html"|g' "$file"
  sed -i 's|href="/"|href="./index.html"|g' "$file"
  
  # Update script tags
  sed -i 's|src="./js/navigation.js"|src="./navigation.js"|g' "$file"
  sed -i 's|src="./js/home.js"|src="./home.js"|g' "$file"
  # Also remove any potential leading /js/
  sed -i 's|src="/js/|src="./|g' "$file"
done
