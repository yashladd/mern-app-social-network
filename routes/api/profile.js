const express = require('express');
const auth = require('../../middleware/auth');
const router = express.Router();
const Profile = require('../../models/Profile');
const User = require('../../models/User');
const { check, validationResult } = require('express-validator/check');
const request = require('request');
const config = require('config');

//@route  GET api/profile/me
//@desc   Get curr users profile
//@access Private
router.get('/me', auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({
      user: req.user.id,
    }).populate('user', ['name', 'avatar']);

    if (!profile) {
      return res.status(400).json({ msg: 'There is no profile for this user' });
    }

    res.json(profile);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error');
  }
});

//@route  POST api/profile
//@desc   Create or update user profile
//@access Private
router.post(
  '/',
  [
    auth,
    [
      check('status', 'status is required').not().isEmpty(),
      check('skills', 'skills is required').not().isEmpty(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      company,
      location,
      website,
      bio,
      skills,
      status,
      githubusername,
      youtube,
      twitter,
      instagram,
      linkedin,
      facebook,
    } = req.body;

    // Build profile object
    const profileFields = {};
    profileFields.user = req.user.id;

    if (company) {
      profileFields.company = company;
    }

    if (website) profileFields.website = website;
    if (location) profileFields.location = location;
    if (bio) profileFields.bio = bio;
    if (status) profileFields.status = status;
    if (githubusername) profileFields.githubusername = githubusername;
    if (skills) {
      profileFields.skills = skills.split(',').map((skill) => skill.trim());
    }

    //build social object
    profileFields.social = {};
    if (youtube) profileFields.social.youtube = youtube;
    if (twitter) profileFields.social.twitter = twitter;
    if (linkedin) profileFields.social.linkedin = linkedin;
    if (facebook) profileFields.social.facebook = facebook;

    try {
      let profile = await Profile.findOne({ user: req.user.id });

      if (profile) {
        //update
        profile = await Profile.findOneAndUpdate(
          { user: req.user.id },
          { $set: profileFields },
          { new: true }
        );

        return res.json(profile);
      }

      //Create
      profile = new Profile(profileFields);

      await profile.save();

      res.json(profile);
    } catch (error) {
      console.error(error.message);
      res.status(500).send('Server error');
    }

    res.send('asdasd');
  }
);

//@route  GET api/profile
//@desc   Get all profiles
//@access Public
router.get('/', async (req, res) => {
  try {
    const profiles = await Profile.find().populate('user', ['name', 'avatar']);
    res.json(profiles);
  } catch (error) {
    console.error(error.message);
    return res.status(500).send('Server error');
  }
});

//@route  GET api/profile/user/:user_id
//@desc   Get profile by user_id
//@access Public
router.get('/user/:user_id', async (req, res) => {
  try {
    const profile = await Profile.findOne({
      user: req.params.user_id,
    }).populate('user', ['name', 'avatar']);

    if (!profile) return res.status(400).json({ msg: 'Profile not found' });

    res.json(profile);
  } catch (error) {
    console.error(error.message);
    if (error.kind == 'ObjectId') {
      return res.status(400).json({ msg: 'Profile not found' });
    }
    return res.status(500).send('Server error');
  }
});

//@route  DELETE api/profile
//@desc   Delete profile, user and post
//@access Private
router.delete('/', auth, async (req, res) => {
  try {
    //@todo - remove users posts
    //Remove profile
    await Profile.findOneAndRemove({ user: req.user.id });
    // Remove the user
    await User.findOneAndRemove({ _id: req.user.id });

    res.json({ msg: 'User removed' });
  } catch (error) {
    console.error(error.message);
    return res.status(500).send('Server error');
  }
});

//@route  PUT api/profile/experience
//@desc   Add profile experience
//@access Private
router.put(
  '/experience',
  [
    auth,
    [
      check('title', 'Title is required').not().isEmpty(),
      check('company', 'Company is required').not().isEmpty(),
      check('from', 'From Date is required').not().isEmpty(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title,
      company,
      location,
      from,
      to,
      current,
      desctription,
    } = req.body;

    const newExp = {
      title,
      company,
      location,
      from,
      to,
      current,
      desctription,
    };

    try {
      const profile = await Profile.findOne({ user: req.user.id });

      profile.experience.unshift(newExp);
      await profile.save();
      res.json(profile);
    } catch (error) {
      console.error(error.message);
      res.status(500).send('Server Error');
    }
  }
);

//@route  DELETE api/profile
//@desc   Delete profile, user and post
//@access Private
router.delete('/', auth, async (req, res) => {
  try {
    //@todo - remove users posts
    //Remove profile
    await Profile.findOneAndRemove({ user: req.user.id });
    // Remove the user
    await User.findOneAndRemove({ _id: req.user.id });

    res.json({ msg: 'User removed' });
  } catch (error) {
    console.error(error.message);
    return res.status(500).send('Server error');
  }
});

//@route  DELETE api/profile/experience/:exp_id
//@desc   Delete experience from profile
//@access Private
router.delete('/experience/:exp_id', auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id });

    //get remove idx
    const removeIdx = profile.experience
      .map((item) => item.id)
      .indexOf(req.params.exp_id);

    profile.experience.splice(removeIdx, 1);

    profile.save();

    res.json(profile);
  } catch (error) {
    console.error(error.message);
    return res.status(500).send('Server error');
  }
});

//@route  PUT api/profile/education
//@desc   Add profile education
//@access Private
router.put(
  '/education',
  [
    auth,
    [
      check('school', 'school is required').not().isEmpty(),
      check('degree', 'degree is required').not().isEmpty(),
      check('from', 'From Date is required').not().isEmpty(),
      check('fieldofstudy', 'fieldofstudy is required').not().isEmpty(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      school,
      degree,
      fieldofstudy,
      from,
      to,
      current,
      desctription,
    } = req.body;

    const newEdu = {
      school,
      degree,
      fieldofstudy,
      from,
      to,
      current,
      desctription,
    };

    try {
      const profile = await Profile.findOne({ user: req.user.id });

      profile.education.unshift(newEdu);
      await profile.save();
      res.json(profile);
    } catch (error) {
      console.error(error.message);
      res.status(500).send('Server Error');
    }
  }
);

//@route  DELETE api/profile/education/:edu_id
//@desc   Delete education from profile
//@access Private
router.delete('/education/:edu_id', auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id });

    //get remove idx
    const removeIdx = profile.education
      .map((item) => item.id)
      .indexOf(req.params.edu_id);

    profile.education.splice(removeIdx, 1);

    profile.save();

    res.json(profile);
  } catch (error) {
    console.error(error.message);
    return res.status(500).send('Server error');
  }
});

//@route  GET api/profile/github/:username
//@desc   Get repos from github
//@access Public
router.get('/github/:username', (req, res) => {
  try {
    const options = {
      uri: `https://api.github.com/users/${
        req.params.username
      }/repos?per_page=5&sort=created:asc&client_id=${config.get(
        'githubclientid'
      )}&client_secret=${config.get('githubsecret')}`,
      method: 'GET',
      headers: { 'user-agent': 'node.js' },
    };

    request(options, (error, response, body) => {
      if (error) console.error(error);

      if (response.statusCode !== 200) {
        return res.status(400).json({ msg: 'No Github profile found' });
      }

      res.json(JSON.parse(body));
    });
  } catch (error) {
    console.error(error.message);
    return res.status(500).send('Server error');
  }
});

module.exports = router;
