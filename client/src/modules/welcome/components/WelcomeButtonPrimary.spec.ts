import { mount } from '@vue/test-utils';
import WelcomeButtonPrimary from './WelcomeButtonPrimary.vue';

describe('WelcomeButtonPrimary.vue', () => {
  it('renders correctly', () => {
    const wrapper = mount(WelcomeButtonPrimary);
    expect(wrapper.text()).toContain('Jetzt loslegen');
    expect(wrapper.classes()).toContain('main-dashboard-btn');
  });

  it('emits click event when clicked', async () => {
    const wrapper = mount(WelcomeButtonPrimary);
    await wrapper.trigger('click');
    expect(wrapper.emitted('click')).toBeTruthy();
  });
});