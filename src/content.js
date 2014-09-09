var Feed = function() {
  var that = this;

  this.contentList = {};

  setInterval(function() {
    that.parseNew();
  }, 1000);

  this.parseNew();
};

Feed.prototype.parseNew = function() {
  var that = this;

  $('.userContentWrapper').each(function() {
    var $el = $(this),
        data = $el.parent().data('ft'),
        id  = data ? data.mf_story_key : null;

    if (id) {
      if (!that.contentList[id]) {
        that.contentList[id] = new Content(id, $el);
      } else {
        that.contentList[id].refresh($el);
      }
    }
  });
};

var Content = function(id, $el) {
  var that = this;

  this.id  = id;
  this.$el = $el;
  this.mode = 'all';

  this.ownerName = this.detectOwnerName();

  if (!this.ownerName) {
    return this;
  }

  this.$link = $('<div class="show-comments" style="float:right;">'
                   + '<a href="#" class="show-owner-comments">View ' + this.ownerName + ' Comments</a>'
                   + '<a href="#" class="show-all-comments" style="display:none;">View All Comments</a>'
               + '</div>');

  $el.find('.UFILikeSentenceText').append(this.$link);

  this.$link.on('click', function() {
    that.toggleMode();
  });

  this.$noComments = $('<li class="UFIRow no-comments" style="text-align:center;">No ' + this.ownerName + ' comments</li>');

  setInterval(function() {
    that.updateMode();
  }, 100);

  that.updateMode();
};

Content.prototype.refresh = function($el) {
  this.$el = $el;

  if (!this.$el.find('.UFILikeSentenceText .show-comments').length) {
    this.$el.find('.UFILikeSentenceText').append(this.$link);

    this.updateMode();
  }
};

Content.prototype.detectOwnerName = function() {
  return this.$el.find('a[data-hovercard]:not([aria-hidden]):eq(0)').html();
};

Content.prototype.toggleMode = function() {
  if (this.mode === 'all') {
    this.showOwnerComments();
    this.mode = 'owner';
    this.$link.find('.show-owner-comments').hide();
    this.$link.find('.show-all-comments').show();
  } else {
    this.showAllComments();
    this.mode = 'all';
    this.$link.find('.show-owner-comments').show();
    this.$link.find('.show-all-comments').hide();
    this.toggleNoComments(false);
  }
};

Content.prototype.updateMode = function() {
    if (this.mode === 'owner') {
      this.showOwnerComments();
    } else {
      this.$link.toggle(!!this.getCommentsCount());
    }
};

Content.prototype.getCommentsCount = function() {
  return this.$el.find('.UFIComment').length;
};

Content.prototype.showOwnerComments = function() {
  var name = this.ownerName,
      count = 0;

  this.$el.find('.UFIComment').each(function() {
    var $comment = $(this);

    if (name !== $comment.find('.UFICommentActorName').html()) {
      $comment.hide();
    } else {
      count++;
    }
  });

  if (!count && !this.fetchComments()) {
    this.toggleNoComments(true);
  } else {
    this.toggleNoComments(false);
  }
};

Content.prototype.toggleNoComments = function(needShow) {
  if (needShow) {
    if (!this.$el.find('.UFIList .no-comments').length) {
      if (this.$el.find('.UFIAddComment').length) {
        this.$el.find('.UFIAddComment').before(this.$noComments);
      } else {
        this.$el.find('.UFIList').append(this.$noComments);
      }
    }
  } else {
    this.$el.find('.no-comments').remove();
  }
};

Content.prototype.showAllComments = function() {
  this.$el.find('.UFIComment').show();
};

Content.prototype.fetchComments = function() {
  var pager = this.$el.find('.UFIPagerLink')[0];

  if (pager) {
    pager.click();
    return true;
  }

  return false;
};

var PageState = function() {
  this.currentUrl = window.location.href;

  var that = this;

  setInterval(function() {
    if (that.currentUrl !== window.location.href) {
      that.currentUrl = window.location.href;

      that.onChange();
    }
  }, 1000);
};

PageState.prototype.onChange = function() {};

// initialize
var feed = new Feed();