export class CustomPropertiesImpl implements PrivateCustomProperties {
  private props: {key: string, value:string}[] = [];

  public constructor(header: string) {
      this.addHeaderData(header);
  }


  public addHeaderData(header?: string) {
      const keyvals = header ? header.split(", ") : [];
      this.props = keyvals.map((keyval) => {
          const parts = keyval.split("=");
          return {key: parts[0], value: parts[1]};
      }).concat(this.props);
  }

  public serializeToHeader() {
      return this.props.map((keyval) => {
          return `${keyval.key}=${keyval.value}`
      }).join(", ");
  }

  public getProperty(prop: string): string {
      for(let i = 0; i < this.props.length; ++i) {
          const keyval = this.props[i]
          if (keyval.key === prop) {
              return keyval.value;
          }
      }
      return '';
  }

  // TODO: Strictly according to the spec, properties which are recieved from
  // an incoming request should be left untouched, while we may add our own new
  // properties. The logic here will need to change to track that.
  public setProperty(prop: string, val: string) {

      for (let i = 0; i < this.props.length; ++i) {
          const keyval = this.props[i];
          if (keyval.key === prop) {
              keyval.value = val;
              return;
          }
      }
      this.props.push({key: prop, value: val});
  }
}

export interface CustomProperties {
  /**
   * Get a custom property from the correlation context
   */
  getProperty(key: string): string;
  /**
   * Store a custom property in the correlation context.
   * Do not store sensitive information here.
   * Properties stored here are exposed via outgoing HTTP headers for correlating data cross-component.
   * The characters ',' and '=' are disallowed within keys or values.
   */
  setProperty(key: string, value: string): void;
}

export interface PrivateCustomProperties extends CustomProperties {
  addHeaderData(header: string): void;
  serializeToHeader(): string;
}
