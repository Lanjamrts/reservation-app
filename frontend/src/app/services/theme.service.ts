import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly THEME_KEY = 'theme-mode';

  setTheme(isLight: boolean) {
    const classList = document.body.classList;
    if (isLight) {
      classList.add('light-theme');
      classList.remove('dark-theme');
      localStorage.setItem(this.THEME_KEY, 'light');
    } else {
      classList.remove('light-theme');
      classList.add('dark-theme');
      localStorage.setItem(this.THEME_KEY, 'dark');
    }
  }

  initTheme() {
    const saved = localStorage.getItem(this.THEME_KEY);
    if (saved === 'light') {
      this.setTheme(true);
    } else {
      this.setTheme(false);
    }
  }

  toggleTheme() {
    const isLight = document.body.classList.contains('light-theme');
    this.setTheme(!isLight);
  }

  isLightTheme(): boolean {
    return document.body.classList.contains('light-theme');
  }
}
