interface Story {
  id: string;
  title: string;
  content: string;
}

class StoryStorage {
  private stories: Story[] = [];

  public saveStory(story: Story): void {
    this.stories.push(story);
  }

  public getStory(id: string): Story | undefined {
    return this.stories.find((story) => story.id === id);
  }

  public getAllStories(): Story[] {
    return this.stories;
  }
}

const storyStorage = new StoryStorage();

export function saveStory(story: Story): void {
  storyStorage.saveStory(story);
}

export function getStory(id: string): Story | undefined {
  return storyStorage.getStory(id);
}

export function getAllStories(): Story[] {
  return storyStorage.getAllStories();
}