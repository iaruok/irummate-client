import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize } from '@capacitor/keyboard';

const config: CapacitorConfig = {
  // 스토어 등록 후에는 바꿀 수 없다. 결정 기록: docs/adr/0002-native-projects.md
  appId: 'com.irummate.app',
  appName: '이룸매이트',
  webDir: 'dist',
  plugins: {
    // 앱의 fetch·XHR을 네이티브 HTTP로 보내 재발급 쿠키를 네이티브 쪽이 관리하게 한다(토큰 재발급 ①).
    CapacitorHttp: {
      enabled: true,
    },
    // iOS도 키보드가 열리면 웹뷰 전체를 줄인다. Android는 Capacitor가 이미 같은 방식으로 줄인다.
    // 두 플랫폼이 같아야 하단 고정 요소가 키보드 높이를 따로 더하지 않아도 된다. 결정 기록: docs/adr/0007-keyboard-resize.md
    // Keyboard.resizeOnFullScreen은 넣지 않는다(Capacitor의 화면 가장자리 처리와 겹친다).
    Keyboard: {
      resize: KeyboardResize.Native,
    },
  },
};

export default config;
