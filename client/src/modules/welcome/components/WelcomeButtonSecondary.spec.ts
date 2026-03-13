import { mount } from '@vue/test-utils';
import WelcomeButtonSecondary from './WelcomeButtonSecondary.vue';

describe('WelcomeButtonSecondary.vue', () => {
  it('renders correctly', () => {
    const wrapper = mount(WelcomeButtonSecondary);
    expect(wrapper.text()).toContain('Mehr erfahren');
    expect(wrapper.classes()).toContain('main-dashboard-btn');
  });

  it('emits click event when clicked', async () => {
    const wrapper = mount(WelcomeButtonSecondary);
    await wrapper.trigger('click');
    expect(wrapper.emitted('click')).toBeTruthy();
  });
});