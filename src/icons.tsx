import arrowBack from '@material-design-icons/svg/filled/arrow_back.svg?raw';
import business from '@material-design-icons/svg/filled/business.svg?raw';
import cloudOff from '@material-design-icons/svg/filled/cloud_off.svg?raw';
import coffee from '@material-design-icons/svg/filled/local_cafe.svg?raw';
import errorOutline from '@material-design-icons/svg/filled/error_outline.svg?raw';
import explore from '@material-design-icons/svg/filled/explore.svg?raw';
import history from '@material-design-icons/svg/filled/history.svg?raw';
import locationOn from '@material-design-icons/svg/filled/location_on.svg?raw';
import notificationsOff from '@material-design-icons/svg/filled/notifications_off.svg?raw';
import openInNew from '@material-design-icons/svg/filled/open_in_new.svg?raw';
import publicIcon from '@material-design-icons/svg/filled/public.svg?raw';
import refresh from '@material-design-icons/svg/filled/refresh.svg?raw';
import rocketLaunch from '@material-design-icons/svg/filled/rocket_launch.svg?raw';
import schedule from '@material-design-icons/svg/filled/schedule.svg?raw';
import settings from '@material-design-icons/svg/filled/settings.svg?raw';
import star from '@material-design-icons/svg/filled/star.svg?raw';
import starBorder from '@material-design-icons/svg/filled/star_border.svg?raw';
import wifiOff from '@material-design-icons/svg/filled/wifi_off.svg?raw';

// The same Material icon set the Android app uses (Apache-2.0), inlined at build time.
const ICONS = {
  arrowBack, business, cloudOff, coffee, errorOutline, explore, history, locationOn, notificationsOff,
  openInNew, public: publicIcon, refresh, rocketLaunch, schedule, settings, star, starBorder, wifiOff,
};

export type IconName = keyof typeof ICONS;

export function Icon({ name, class: className = '' }: { name: IconName; class?: string }) {
  return <span class={`icon ${className}`} aria-hidden="true" data-icon={name} dangerouslySetInnerHTML={{ __html: ICONS[name] }} />;
}
