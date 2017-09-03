import React from 'react';
import PropTypes from 'prop-types'
import Me from '../Me/Me';
import Icon from '../Icon/Icon';
import ContactIcon from '../Icon/ContactIcon';
import MoveAround from '../MoveAround/MoveAround';
import PageTransition from '../PageTransition/PageTransition';

import { PageExperience, PageEducation, PageProfile, PageProject, PageContact } from '../Page';

import { translateXY, scale, transform } from '../../util/cssUtil';

import icons from '../../resources/Asset';

const DIMENSION = {
  ICON_SIZE: 45,
  PADDING: 10,
  BIG_PADDING: 40,
}

const State = {
  Profile: 'profile',
  Education: 'education',
  Experience: 'experience',
  Project: 'project',
  Contact: 'contact',
  Menu: ''
}

const Icons = [
  { icon: icons.profile, name: 'Profile', state: State.Profile },
  { icon: icons.mortarboard, name: 'Education', state: State.Education },
  { icon: icons.briefcase, name: 'Experience', state: State.Experience },
  { icon: icons.laptop, name: 'Projects', state: State.Project }
];

class Main extends React.Component {
  constructor (props, context) {
    super(props);
    this.state = {
      state: State.Menu,
    }
  }
  renderIcons () {
    const iconHeightAndPadding = DIMENSION.ICON_SIZE + DIMENSION.PADDING;
    const { innerHeight, innerWidth, gotoURL, location: state } = this.context;

    const potrait = innerHeight > innerWidth;
    const bigIconSize = potrait ? Math.min((innerHeight - DIMENSION.BIG_PADDING * 4) / 3, ((innerWidth - DIMENSION.BIG_PADDING * 3) / 2)) : ((innerWidth - DIMENSION.BIG_PADDING * 6) / 5);
    const bigPaddingXPotrait = (innerWidth - 2 * bigIconSize) / 3;

    const bigIconHeightAndPadding = bigIconSize + DIMENSION.BIG_PADDING;
    const offsetX = (bigIconSize - DIMENSION.ICON_SIZE) / 2;
    const offsetY =
      (potrait
        ? (innerHeight - (bigIconHeightAndPadding) * 2) // offset for anchor from bottom
        : ((innerHeight - bigIconSize) / 2) ) // offset for center align
      + ((bigIconSize - DIMENSION.ICON_SIZE) / 2); // offset for scaling

    const fromMe = transform(translateXY(DIMENSION.PADDING, DIMENSION.PADDING))
    const toMe = transform(
      translateXY(
        (bigIconSize - DIMENSION.ICON_SIZE) / 2 + (potrait ? bigPaddingXPotrait : DIMENSION.BIG_PADDING),
        (potrait
          ? ((offsetY - bigIconSize)/ 2)
          : offsetY)
      ),
      scale(bigIconSize / DIMENSION.ICON_SIZE)
    )

    return [
      (
        <MoveAround key='me' moved={state === State.Menu} from={fromMe} to={toMe}>
          <Me onClick={() => gotoURL('#')}/>
        </MoveAround>
      ),
      ...Icons.map(({icon, name, state: iconState}, index) => {
        const posX = potrait ? index % 2 : (index + 1);
        const posY = potrait ? index >> 1 : 0;

        const from = transform(
          translateXY(
            DIMENSION.PADDING,
            iconHeightAndPadding + DIMENSION.PADDING + index * iconHeightAndPadding
          )
        );
        const to = transform(
          translateXY(
            (potrait ? bigPaddingXPotrait : DIMENSION.BIG_PADDING) + offsetX + bigIconHeightAndPadding * posX,
            offsetY + bigIconHeightAndPadding * posY
          ),
          scale(bigIconSize / DIMENSION.ICON_SIZE)
        );

        return (
          <MoveAround key={icon} moved={state === State.Menu} from={from} to={to}>
            <Icon active={state === iconState} icon={icon} name={name} index={index} onClick={() => gotoURL(`#${iconState}`) } />
          </MoveAround>
        )
      }),
      <MoveAround key='contact' moved={false} from={transform(
        translateXY(
          DIMENSION.PADDING,
          iconHeightAndPadding + DIMENSION.PADDING + 4 * iconHeightAndPadding
        )
      )}>
        <ContactIcon onClick={() => gotoURL('#contact')} icon={icons.contact} active={state === State.Contact} hide={state === State.Menu}/>
      </MoveAround>
    ]
  }

  render() {
    const { location } = this.context

    return (
      <div>
        { this.renderIcons() }
        <PageTransition show={location === State.Profile} page={PageProfile} />
        <PageTransition show={location === State.Education} page={PageEducation} />
        <PageTransition show={location === State.Experience} page={PageExperience} />
        <PageTransition show={location === State.Project} page={PageProject} />
        <PageTransition show={location === State.Contact} page={PageContact} />
      </div>
    );
  }
}

Main.contextTypes = {
  innerHeight: PropTypes.number,
  innerWidth: PropTypes.number,
  gotoURL: PropTypes.func,
  location: PropTypes.string,
};

export default Main;
